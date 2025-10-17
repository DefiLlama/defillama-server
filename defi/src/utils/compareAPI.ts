/**
 * compareAPI.ts - API Comparison Tool
 * 
 * Compares two API environments (e.g., production vs beta) for deployment validation.
 * Tests both schema compliance AND actual data values.
 * 
 * Why data comparison works: Both environments use the same database.
 * When called simultaneously, they query the same data snapshot.
 * Any differences indicate bugs in the candidate deployment.
 * 
 * Supports both free and pro API testing.
 * 
 * Usage:
 *   npm run compare-api          # Compare free API
 *   npm run compare-api -- --api-type pro  # Compare pro API
 * 
 * See API_VALIDATION_README.md for full documentation.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  loadOpenApiSpec,
  getAllEndpoints,
  fetchWithRetry,
  validateResponseAgainstSchema,
  compareResponses,
  getBetaServerUrl,
  EndpointInfo,
  sendMessage,
} from './apiValidateUtils';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// DEBUG: Set specific endpoint to test only that endpoint (for debugging)
// Example: '/api/v2/chains' or '/api/oracles'
// Set to null to test all endpoints
// const DEBUG_ENDPOINT: string | null = null;
const DEBUG_ENDPOINT = '/api/v2/chains';
// const DEBUG_ENDPOINT = '/api/oracles';

interface ComparisonResult {
  endpoint: string;
  prodUrl: string;
  betaUrl: string;
  status: 'pass' | 'fail' | 'schema_fail' | 'network_error';
  prodResponseTime?: number;
  betaResponseTime?: number;
  schemaValidation: {
    prod: { valid: boolean; errors: string[] };
    beta: { valid: boolean; errors: string[] };
  };
  dataComparison?: {
    isMatch: boolean;
    differences: string[];
  };
  errors: string[];
  // TEMP DEBUG: Store actual responses for debugging
  prodResponse?: any;
  betaResponse?: any;
}

interface ComparisonReport {
  timestamp: string;
  apiType: 'free' | 'pro';
  tolerance: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    schemaFailures: number;
    networkErrors: number;
    skippedDataComparison: number;
    averageProdResponseTime: number;
    averageBetaResponseTime: number;
  };
  failedEndpoints: ComparisonResult[];
  significantDifferences: string[];
  passedEndpoints?: ComparisonResult[];
}

async function compareEndpoint(
  endpoint: EndpointInfo,
  tolerance: number = 0.1
): Promise<ComparisonResult> {
  const prodUrl = `${endpoint.serverUrl}${endpoint.path}`;
  const betaUrl = getBetaServerUrl(prodUrl);
  
  const result: ComparisonResult = {
    endpoint: endpoint.path,
    prodUrl,
    betaUrl,
    status: 'fail',
    schemaValidation: {
      prod: { valid: false, errors: [] },
      beta: { valid: false, errors: [] }
    },
    errors: []
  };
  
  try {
    // Fetch from both prod and beta in parallel with 5 retries
    const [prodResponse, betaResponse] = await Promise.allSettled([
      (async () => {
        const start = Date.now();
        const response = await fetchWithRetry(prodUrl, 5, 1000, 45000);
        const responseTime = Date.now() - start;
        return { data: response.data, responseTime };
      })(),
      (async () => {
        const start = Date.now();
        const response = await fetchWithRetry(betaUrl, 5, 1000, 45000);
        const responseTime = Date.now() - start;
        return { data: response.data, responseTime };
      })()
    ]);
    
    if (prodResponse.status === 'rejected') {
      result.errors.push(`Prod API error: ${prodResponse.reason.message}`);
      result.status = 'network_error';
      return result;
    }
    
    if (betaResponse.status === 'rejected') {
      result.errors.push(`Beta API error: ${betaResponse.reason.message}`);
      result.status = 'network_error';
      return result;
    }
    
    const prodData = prodResponse.value.data;
    const betaData = betaResponse.value.data;
    result.prodResponseTime = prodResponse.value.responseTime;
    result.betaResponseTime = betaResponse.value.responseTime;
    
    // TEMP DEBUG: Store responses in result for JSON report
    if (DEBUG_ENDPOINT) {
      result.prodResponse = prodData;
      result.betaResponse = betaData;
    }
    
    // Validate both responses against OpenAPI schema
    const prodValidation = await validateResponseAgainstSchema(prodData, endpoint.schema);
    const betaValidation = await validateResponseAgainstSchema(betaData, endpoint.schema);
    
    result.schemaValidation.prod = prodValidation;
    result.schemaValidation.beta = betaValidation;
    
    if (!prodValidation.valid || !betaValidation.valid) {
      result.status = 'schema_fail';
      if (!prodValidation.valid) {
        result.errors.push(`Prod schema validation failed: ${prodValidation.errors.join(', ')}`);
      }
      if (!betaValidation.valid) {
        result.errors.push(`Beta schema validation failed: ${betaValidation.errors.join(', ')}`);
      }
      return result;
    }
    
    // Both schemas are valid - now compare the actual data
    // Since prod and beta use the same DB and are called simultaneously,
    // they should return the same (or very similar) values
    const comparison = compareResponses(prodData, betaData, tolerance);
    result.dataComparison = comparison;
    
    if (comparison.isMatch) {
      result.status = 'pass';
    } else {
      result.status = 'fail';
      result.errors.push(`Data mismatch: ${comparison.differences.length} differences found`);
    }
    
    return result;
    
  } catch (error: any) {
    result.errors.push(`Unexpected error: ${error.message}`);
    result.status = 'network_error';
    return result;
  }
}

async function compareAllEndpoints(
  apiType: 'free' | 'pro' = 'free',
  tolerance: number = 0.1,
  specificEndpoint?: string,
  specificDomain?: string,
  includeSuccess: boolean = false
): Promise<ComparisonReport> {
  
  try {
    const spec = await loadOpenApiSpec(apiType);
    let endpoints = getAllEndpoints(spec, true, apiType);
    
    // DEBUG: Filter to specific endpoint if DEBUG_ENDPOINT is set
    if (DEBUG_ENDPOINT) {
      endpoints = endpoints.filter(ep => ep.path === DEBUG_ENDPOINT);
      console.log(`[DEBUG MODE] Testing only endpoint: ${DEBUG_ENDPOINT}`);
      if (endpoints.length === 0) {
        console.log(`[DEBUG MODE] No endpoint found matching: ${DEBUG_ENDPOINT}`);
      }
    }
    
    if (specificEndpoint) {
      endpoints = endpoints.filter(ep => ep.path.includes(specificEndpoint));
      console.log(`filtering to endpoints containing: ${specificEndpoint}`);
    }
    
    if (specificDomain) {
      endpoints = endpoints.filter(ep => ep.serverUrl.includes(specificDomain));
      console.log(`filtering to domain: ${specificDomain}`);
    }
    
    console.log(`comparing ${endpoints.length} endpoints between prod and beta...`);
    
    const results: ComparisonResult[] = [];
    const prodResponseTimes: number[] = [];
    const betaResponseTimes: number[] = [];
    
    for (const [index, endpoint] of endpoints.entries()) {
      const progress = ((index + 1) / endpoints.length * 100).toFixed(1);
      process.stdout.write(`\rprogress: ${progress}% (${index + 1}/${endpoints.length}) - comparing ${endpoint.path}`);
      
      try {
        const result = await compareEndpoint(endpoint, tolerance);
        results.push(result);
        
        if (result.prodResponseTime) prodResponseTimes.push(result.prodResponseTime);
        if (result.betaResponseTime) betaResponseTimes.push(result.betaResponseTime);
        
        if (result.status === 'fail') {
          console.log(`\n❌ DATA MISMATCH: ${endpoint.path}`);
          result.errors.forEach(error => console.log(`   • ${error}`));
          
          if (result.dataComparison && result.dataComparison.differences.length > 0) {
            const topDiffs = result.dataComparison.differences.slice(0, 3);
            topDiffs.forEach(diff => console.log(`   📊 ${diff}`));
            if (result.dataComparison.differences.length > 3) {
              console.log(`   ... and ${result.dataComparison.differences.length - 3} more differences`);
            }
          }
        } else if (result.status === 'schema_fail') {
          console.log(`\n🔧 SCHEMA FAIL: ${endpoint.path}`);
          result.errors.forEach(error => console.log(`   • ${error}`));
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error: any) {
        const failedResult: ComparisonResult = {
          endpoint: endpoint.path,
          prodUrl: `${endpoint.serverUrl}${endpoint.path}`,
          betaUrl: getBetaServerUrl(`${endpoint.serverUrl}${endpoint.path}`),
          status: 'network_error',
          schemaValidation: {
            prod: { valid: false, errors: [] },
            beta: { valid: false, errors: [] }
          },
          errors: [`Critical error: ${error.message}`]
        };
        results.push(failedResult);
        console.log(`\nERROR: ${endpoint.path} - ${error.message}`);
      }
    }
    
    console.log('\n');
    
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const schemaFailures = results.filter(r => r.status === 'schema_fail').length;
    const networkErrors = results.filter(r => r.status === 'network_error').length;
    const skippedDataComparison = 0; // We compare data for all endpoints
    
    const avgProdResponseTime = prodResponseTimes.length > 0 
      ? Math.round(prodResponseTimes.reduce((a, b) => a + b, 0) / prodResponseTimes.length)
      : 0;
    const avgBetaResponseTime = betaResponseTimes.length > 0 
      ? Math.round(betaResponseTimes.reduce((a, b) => a + b, 0) / betaResponseTimes.length)
      : 0;
    
    const significantDifferences: string[] = [];
    results.forEach(result => {
      if (result.dataComparison && !result.dataComparison.isMatch) {
        result.dataComparison.differences.forEach(diff => {
          if (!significantDifferences.includes(diff)) {
            significantDifferences.push(diff);
          }
        });
      }
    });
    
    const failedResults = results.filter(r => r.status !== 'pass');
    const passedResults = results.filter(r => r.status === 'pass');
    
    const report: ComparisonReport = {
      timestamp: new Date().toISOString(),
      apiType,
      tolerance,
      summary: {
        total: results.length,
        passed,
        failed,
        schemaFailures,
        networkErrors,
        skippedDataComparison,
        averageProdResponseTime: avgProdResponseTime,
        averageBetaResponseTime: avgBetaResponseTime
      },
      failedEndpoints: failedResults,
      significantDifferences: significantDifferences.slice(0, 20)
    };
    
    // Only include successful results if requested
    if (includeSuccess) {
      report.passedEndpoints = passedResults;
    }
    
    return report;
    
  } catch (error: any) {
    console.error('error during comparison:', error.message);
    throw error;
  }
}

async function generateComparisonReport(report: ComparisonReport, outputFile?: string): Promise<void> {
  const { summary, significantDifferences, apiType, tolerance } = report;
  
  console.log('\ncomparison summary');
  console.log('='.repeat(50));
  console.log(`api: ${apiType}`);
  console.log(`total endpoints: ${summary.total}`);
  console.log(`passed (schema + data): ${summary.passed}`);
  console.log(`data mismatch: ${summary.failed}`);
  console.log(`schema failed: ${summary.schemaFailures}`);
  console.log(`network errors: ${summary.networkErrors}`);
  console.log(`success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  console.log(`prod avg resp: ${summary.averageProdResponseTime}ms`);
  console.log(`beta avg resp: ${summary.averageBetaResponseTime}ms`);
  console.log(`tolerance: ${tolerance * 100}%`);
  
  if (significantDifferences.length > 0) {
    console.log('\nTop differences found:');
    significantDifferences.slice(0, 10).forEach((diff, index) => {
      console.log(`${index + 1}. ${diff}`);
    });
    
    if (significantDifferences.length > 10) {
      console.log(`... and ${significantDifferences.length - 10} more difference patterns`);
    }
  }

  const reportFile = outputFile || path.join(__dirname, '../beta_comparison_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\nfull comparison report saved to: ${reportFile}`);
}

async function sendNotification(report: ComparisonReport, isDryRun: boolean = false): Promise<void> {
  const { summary, apiType } = report;
  
  if (summary.failed === 0 && summary.schemaFailures === 0 && summary.networkErrors === 0) {
    console.log('\nall comparisons passed - no notification needed');
    return;
  }
  
  const failedEndpointsList = report.failedEndpoints.map(r => `${r.endpoint} (${r.status})`);
  
  const failureMessage = "```" +
    `beta comparison - issues detected\n\n` +
    `${apiType} api:\n` +
    `• total endpoints: ${summary.total}\n` +
    `• passed: ${summary.passed}\n` +
    `• data mismatch: ${summary.failed}\n` +
    `• schema failed: ${summary.schemaFailures}\n` +
    `• network errors: ${summary.networkErrors}\n` +
    `• success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%\n` +
    `• prod avg resp: ${summary.averageProdResponseTime}ms\n` +
    `• beta avg resp: ${summary.averageBetaResponseTime}ms\n\n` +
    `failing endpoints (${Math.min(failedEndpointsList.length, 20)} of ${failedEndpointsList.length}):\n` +
    failedEndpointsList.slice(0, 20).map((endpoint, i) => `${i + 1}. ${endpoint}`).join('\n') +
    (failedEndpointsList.length > 20 ? `\n... and ${failedEndpointsList.length - 20} more` : '') +
    `\n\n${report.timestamp}` +
    "```";
  
  console.log('\nsending discord notification');
  
  if (!isDryRun) {
    await sendMessage(failureMessage, process.env.DISCORD_WEBHOOK_URL, false);
  } else {
    console.log('would send:\n', failureMessage);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  let apiType: 'free' | 'pro' = 'free';
  let tolerance = 0.1;
  let specificEndpoint: string | undefined;
  let specificDomain: string | undefined;
  let outputFile: string | undefined;
  let isDryRun = false;
  let includeSuccess = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--api-type':
        apiType = args[++i] as 'free' | 'pro';
        break;
      case '--tolerance':
        tolerance = parseFloat(args[++i]);
        break;
      case '--endpoint':
        specificEndpoint = args[++i];
        break;
      case '--domain':
        specificDomain = args[++i];
        break;
      case '--output':
        outputFile = args[++i];
        break;
      case '--dry-run':
        isDryRun = true;
        break;
      case '--include-success':
        includeSuccess = true;
        break;
      case '--help':
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                 compareAPI.ts - API Comparison Tool                       ║
╚═══════════════════════════════════════════════════════════════════════════╝

PURPOSE:
  Compares production vs beta API responses for deployment validation.
  Tests: Schema compliance + Actual data values.
  
  Why it works: Prod and beta share the same database. When called
  simultaneously, they query the same data. Any differences = bugs in beta!

USAGE:
  npx ts-node src/utils/compareBeta.ts [options]

OPTIONS:
  --api-type <free|pro>    API type to compare (default: free)
  --tolerance <number>     Tolerance for numerical differences (default: 0.1 = 10%)
  --endpoint <pattern>     Filter endpoints containing this pattern
  --domain <domain>        Filter to specific domain (e.g., stablecoins.llama.fi)
  --output <file>          Custom output file for JSON report
  --dry-run               Skip Discord notifications
  --include-success       Include successful endpoints in JSON report (default: false)
  --help                  Show this help message

TOLERANCE EXPLAINED:
  0.0  = Exact match required
  0.05 = 5% difference allowed
  0.1  = 10% difference allowed (default)
  0.2  = 20% difference allowed

EXAMPLES:
  # Compare all free API endpoints (prod vs beta)
  npm run compare-api

  # Compare pro API with strict tolerance
  npm run compare-api -- --api-type pro --tolerance 0.05

  # Test specific protocol endpoints
  npm run compare-api -- --endpoint /protocol

  # Test stablecoins domain only
  npm run compare-api -- --domain stablecoins.llama.fi

  # CI/CD: Run without Discord notification
  npm run compare-api -- --dry-run

OUTPUT:
  ✅ Pass         - Schema valid + data matches (within tolerance)
  ❌ Data mismatch - Values differ between prod and beta
  🔧 Schema fail   - Response doesn't match OpenAPI schema
  ⚠️  Network error - Unable to reach endpoint

TYPICAL WORKFLOW:
  1. Deploy new code to beta environment
  2. Run: npm run compare-api
  3. Review differences (if any)
  4. Fix bugs in beta
  5. Repeat until all tests pass
  6. Promote beta to production

See API_VALIDATION_README.md for full documentation.
        `);
        process.exit(0);
    }
  }
  
  console.log('api compare tool\n');
  
  try {
    const report = await compareAllEndpoints(apiType, tolerance, specificEndpoint, specificDomain, includeSuccess);
    await generateComparisonReport(report, outputFile);
    
    const hasIssues = report.summary.failed > 0 || report.summary.schemaFailures > 0 || report.summary.networkErrors > 0;
    
    if (hasIssues) {
      console.log(`\ncomparison completed with issues`);
      await sendNotification(report, isDryRun);
      process.exit(1);
    } else {
      console.log('\nall comparisons passed successfully!');
      process.exit(0);
    }
    
  } catch (error: any) {
    console.error(`\nerror: ${error.message}`);
    
    if (!isDryRun) {
      await sendMessage(
        `beta comparison critical error!\n\n` +
        `error: ${error.message}\n` +
        `timestamp: ${new Date().toISOString()}`,
        process.env.DISCORD_WEBHOOK_URL,
        false
      );
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}