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
    averageProdResponseTime: number;
    averageBetaResponseTime: number;
  };
  results: ComparisonResult[];
  significantDifferences: string[];
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
    const [prodResponse, betaResponse] = await Promise.allSettled([
      (async () => {
        const start = Date.now();
        const response = await fetchWithRetry(prodUrl);
        const responseTime = Date.now() - start;
        return { data: response.data, responseTime };
      })(),
      (async () => {
        const start = Date.now();
        const response = await fetchWithRetry(betaUrl);
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
    
    // Check if data comparison should be skipped for this endpoint
    if (endpoint.override?.skipDataComparison) {
      result.status = 'pass';
      result.dataComparison = {
        isMatch: true,
        differences: []
      };
      if (endpoint.override.reason) {
        console.log(`Skipping data comparison for ${endpoint.path}: ${endpoint.override.reason}`);
      }
    } else {
      const comparison = compareResponses(prodData, betaData, tolerance);
      result.dataComparison = comparison;
      
      if (comparison.isMatch) {
        result.status = 'pass';
      } else {
        result.status = 'fail';
        result.errors.push(`Data mismatch: ${comparison.differences.length} differences found`);
      }
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
  specificDomain?: string
): Promise<ComparisonReport> {
  console.log(`🔄 beta comparison for ${apiType} api (tolerance: ${tolerance * 100}%)...`);
  
  try {
    const spec = await loadOpenApiSpec(apiType);
    let endpoints = getAllEndpoints(spec, true, apiType);
    
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
          console.log(`\nfailed: ${endpoint.path}`);
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
        averageProdResponseTime: avgProdResponseTime,
        averageBetaResponseTime: avgBetaResponseTime
      },
      results,
      significantDifferences: significantDifferences.slice(0, 20)
    };
    
    return report;
    
  } catch (error: any) {
    console.error('error during comparison:', error.message);
    throw error;
  }
}

async function generateComparisonReport(report: ComparisonReport, outputFile?: string): Promise<void> {
  const { summary, significantDifferences, apiType, tolerance } = report;
  
  console.log('\ncomparasion summary');
  console.log('='.repeat(50));
  console.log(`api: ${apiType}`);
  console.log(`total endpoints: ${summary.total}`);
  console.log(`passed: ${summary.passed}`);
  console.log(`failed: ${summary.failed}`);
  console.log(`schema fail: ${summary.schemaFailures}`);
  console.log(`network errors: ${summary.networkErrors}`);
  console.log(`success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  console.log(`prod avg resp: ${summary.averageProdResponseTime}ms`);
  console.log(`beta avg resp: ${summary.averageBetaResponseTime}ms`);
  console.log(`tolerance set: ${tolerance * 100}%`);
  
  if (significantDifferences.length > 0) {
    console.log('\ntop diff:');
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
  
  const failedEndpoints = report.results
    .filter(r => r.status === 'fail' || r.status === 'schema_fail' || r.status === 'network_error')
    .map(r => `${r.endpoint} (${r.status})`);
  
  const failureMessage = "```" +
    `beta comparison issues detected\n\n` +
    `${apiType} api comparison:\n` +
    `• total endpoints: ${summary.total}\n` +
    `• passed: ${summary.passed}\n` +
    `• failed: ${summary.failed}\n` +
    `• schema failures: ${summary.schemaFailures}\n` +
    `• network errors: ${summary.networkErrors}\n` +
    `• success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%\n` +
    `• prod avg resp: ${summary.averageProdResponseTime}ms\n` +
    `• beta avg resp: ${summary.averageBetaResponseTime}ms\n\n` +
    `failing endpoints (${Math.min(failedEndpoints.length, 20)} of ${failedEndpoints.length}):\n` +
    failedEndpoints.slice(0, 20).map((endpoint, i) => `${i + 1}. ${endpoint}`).join('\n') +
    (failedEndpoints.length > 20 ? `\n... and ${failedEndpoints.length - 20} more` : '') +
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
      case '--help':
        console.log(`
Usage: npx ts-node compare-beta.ts [options]

Options:
  --api-type <free|pro>    API type to compare (default: free)
  --tolerance <number>     Tolerance for numerical differences (default: 0.1 = 10%)
  --endpoint <pattern>     Filter endpoints containing this pattern
  --domain <domain>        Filter to specific domain (e.g., coins, stablecoins)
  --output <file>          Output file for JSON report
  --dry-run               Skip Discord notifications
  --help                  Show this help message

Examples:
  npx ts-node compare-beta.ts
  npx ts-node compare-beta.ts --api-type pro --tolerance 0.05
  npx ts-node compare-beta.ts --endpoint protocols
  npx ts-node compare-beta.ts --domain coins.llama.fi
  npx ts-node compare-beta.ts --dry-run
        `);
        process.exit(0);
    }
  }
  
  console.log('api compare tool\n');
  
  try {
    const report = await compareAllEndpoints(apiType, tolerance, specificEndpoint, specificDomain);
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