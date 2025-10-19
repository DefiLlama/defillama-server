/**
 * validateAPI.ts - OpenAPI Compliance Validator
 * 
 * Validates that API responses match the OpenAPI specification.
 * Tests schema structure, required fields, and data types.
 * Does NOT compare actual values (use compareAPI.ts for that).
 * 
 * Usage:
 *   npx ts-node src/utils/validateAPI.ts [--api-type free|pro] [--endpoint pattern]
 * 
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import {
  loadOpenApiSpec,
  getAllEndpoints,
  testEndpoint,
  ValidationResult,
  sendMessage,
  sanitizeUrlForDisplay,
  buildEndpointDisplayPath
} from './apiValidateUtils';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// DEBUG: Set specific endpoint to test only that endpoint (for debugging)
// Example: '/api/v2/chains' or '/api/oracles'
// Set to null to test all endpoints
const DEBUG_ENDPOINT: string | null = null;
// const DEBUG_ENDPOINT = 'protocol/aave';
// const DEBUG_ENDPOINT = '/api/oracles';

interface ValidationReport {
  timestamp: string;
  environment: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageResponseTime: number;
  };
  failedEndpoints: Array<{
    endpoint: string;
    status: string;
    errors: string[];
    responseTime?: number;
  }>;
}

async function validateAllEndpoints(
  specificEndpoint?: string,
  specificDomain?: string,
  useBeta: boolean = false
): Promise<ValidationReport> {
  const envLabel = useBeta ? 'BETA' : 'PRODUCTION';
  console.log(`\n${'='.repeat(60)}`);
  console.log(`API Validation - ${envLabel}`);
  console.log('='.repeat(60));
  
  try {
    // Load both free and pro specs and merge endpoints
    const freeSpec = await loadOpenApiSpec('free');
    const proSpec = await loadOpenApiSpec('pro');
    let endpoints = [
      ...getAllEndpoints(freeSpec, true, 'free'),
      ...getAllEndpoints(proSpec, true, 'pro')
    ];
    
    console.log(`Loaded ${endpoints.length} total endpoints (free + pro)`);
    
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
      console.log(`Filtering to endpoints containing: ${specificEndpoint}`);
    }
    
    if (specificDomain) {
      endpoints = endpoints.filter(ep => ep.serverUrl.includes(specificDomain));
      console.log(`Filtering to domain: ${specificDomain}`);
    }
    
    // If using beta, map URLs to beta environment
    if (useBeta) {
      const { getBetaServerUrl } = require('./apiValidateUtils');
      endpoints = endpoints.map(ep => ({
        ...ep,
        serverUrl: getBetaServerUrl(`${ep.serverUrl}${ep.path}`).replace(ep.path, '')
      }));
    }
    
    console.log(`Testing ${endpoints.length} endpoints...\n`);
    
    const results: ValidationResult[] = [];
    const totalResponseTimes: number[] = [];
    
    // Use defaults: retryCount=5, retryDelay=1000, requestTimeout=45000, requestDelay=500
    const retryCount = 5;
    const retryDelay = 1000;
    const requestTimeout = 45000;
    const requestDelay = 500;
    
    for (const [index, endpoint] of endpoints.entries()) {
      const progress = ((index + 1) / endpoints.length * 100).toFixed(1);
      
      if (!endpoint.serverUrl) {
        console.log(`\nSkipping endpoint with missing server URL: ${endpoint.path}`);
        continue;
      }

      process.stdout.write(`\rProgress: ${progress}% (${index + 1}/${endpoints.length}) - Testing ${endpoint.path}`);
      
      try {
        const result = await testEndpoint(endpoint, false, retryCount, retryDelay, requestTimeout);
        results.push(result);
        
        if (result.responseTime) {
          totalResponseTimes.push(result.responseTime);
        }
        
        if (result.status === 'fail') {
          const displayPath = buildEndpointDisplayPath(result.endpoint, result.queryParams);
          // console.log(`\nFailed: ${displayPath} on ${sanitizeUrlForDisplay(endpoint.serverUrl)}`);
          // result.errors.forEach(error => console.log(`   • ${error}`));
        }
        
        await new Promise(resolve => setTimeout(resolve, requestDelay));
        
      } catch (error: any) {
        const failedResult: ValidationResult = {
          endpoint: endpoint.path,
          serverUrl: endpoint.serverUrl,
          status: 'fail',
          errors: [`Unexpected error: ${error.message}`],
          queryParams: endpoint.queryParams
        };
        results.push(failedResult);
        const displayPath = buildEndpointDisplayPath(endpoint.path, endpoint.queryParams);
        console.log(`\nError: ${displayPath} - ${error.message}`);
      }
    }
    
    console.log('\n'); 
    
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const averageResponseTime = totalResponseTimes.length > 0 
      ? Math.round(totalResponseTimes.reduce((a, b) => a + b, 0) / totalResponseTimes.length) 
      : 0;
    
    const failedResults = results.filter(r => r.status === 'fail');
    
    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      environment: envLabel,
      summary: {
        total: results.length,
        passed,
        failed,
        averageResponseTime
      },
      failedEndpoints: failedResults.map(r => ({
        endpoint: `${r.serverUrl}${buildEndpointDisplayPath(r.endpoint, r.queryParams)}`,
        status: r.status,
        errors: r.errors,
        responseTime: r.responseTime
      }))
    };
    
    return report;
    
  } catch (error: any) {
    console.error('Error during validation:', error.message);
    throw error;
  }
}

async function generateReport(
  report: ValidationReport, 
  outputFile?: string
): Promise<void> {
  const { summary, failedEndpoints, environment } = report;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`VALIDATION SUMMARY - ${environment}`);
  console.log('='.repeat(60));
  
  console.log(`\nTotal Endpoints: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Avg Response Time: ${summary.averageResponseTime}ms`);
  console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  
  // Show failed endpoints
  if (failedEndpoints.length > 0) {
    console.log(`\n❌ FAILED ENDPOINTS (${failedEndpoints.length}):`);
    failedEndpoints.forEach((item, index) => {
      console.log(`  ${index + 1}. ${sanitizeUrlForDisplay(item.endpoint)}`);
      item.errors.forEach(error => console.log(`     • ${error}`));
    });
  }
  
  const reportFile = outputFile || path.join(__dirname, '../validation_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to: ${reportFile}`);
}

async function sendNotification(report: ValidationReport): Promise<void> {
  const { summary, failedEndpoints, environment } = report;
  
  if (summary.failed === 0) {
    console.log('\n✅ All validations passed - no notification needed');
    return;
  }
  
  const failureMessage = "```" +
    `API Validation ${environment} - Issues Detected\n\n` +
    `Total Endpoints: ${summary.total}\n` +
    `Passed: ${summary.passed}\n` +
    `Failed: ${summary.failed}\n` +
    `Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%\n` +
    `Avg Response: ${summary.averageResponseTime}ms\n\n` +
    `Failed Endpoints (${Math.min(failedEndpoints.length, 20)} of ${failedEndpoints.length}):\n` +
    failedEndpoints.slice(0, 20).map((item, i) => 
      `${i + 1}. ${sanitizeUrlForDisplay(item.endpoint)}`
    ).join('\n') +
    (failedEndpoints.length > 20 ? `\n... and ${failedEndpoints.length - 20} more` : '') +
    `\n\n${report.timestamp}` +
    "```";
  
  console.log('\n📤 Sending Discord notification...');
  
  await sendMessage(failureMessage, process.env.DISCORD_WEBHOOK_URL, false);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  let specificEndpoint: string | undefined;
  let specificDomain: string | undefined;
  let outputFile: string | undefined;
  let useBeta = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--endpoint':
        specificEndpoint = args[++i];
        break;
      case '--domain':
        specificDomain = args[++i];
        break;
      case '--output':
        outputFile = args[++i];
        break;
      case '--beta':
        useBeta = true;
        break;
      case '--help':
        console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    validateAPI.ts - OpenAPI Validator                     ║
╚═══════════════════════════════════════════════════════════════════════════╝

PURPOSE:
  Validates API responses match the OpenAPI specification.
  Merges and tests ALL endpoints (free + pro) in a single run.
  Tests: Schema structure, required fields, data types.
  
  Defaults: 5 retries, 1-5s backoff, 45s timeout, 500ms request delay

USAGE:
  npm run validate-api              # Validate production (default)
  npm run validate-api-beta         # Validate beta environment

OPTIONS:
  --beta                   Test beta URLs instead of production
  --endpoint <pattern>     Filter endpoints containing this pattern
  --domain <domain>        Filter to specific domain (e.g., coins.llama.fi)
  --output <file>          Custom output file for JSON report
  --help                   Show this help message

EXAMPLES:
  # Validate production (all endpoints)
  npm run validate-api

  # Validate beta (all endpoints)
  npm run validate-api-beta

  # Test specific endpoint
  npm run validate-api -- --endpoint /protocol/aave

  # Test coins domain only
  npm run validate-api -- --domain coins.llama.fi

OUTPUT:
  All endpoints tested together (no free/pro separation)
  ✅ Pass  - Response matches OpenAPI schema
  ❌ Fail  - Response doesn't match schema
  
  Report: defi/src/validation_report.json

See API_VALIDATION_README.md for full documentation.
        `);
        process.exit(0);
    }
  }
  
  console.log('🔍 API Validation Tool\n');
  
  try {
    const report = await validateAllEndpoints(specificEndpoint, specificDomain, useBeta);
    await generateReport(report, outputFile);
    
    if (report.summary.failed > 0) {
      console.log(`\n❌ Validation failed with ${report.summary.failed} endpoint failures`);
      await sendNotification(report);
      process.exit(1);
    } else {
      console.log('\n✅ All validations passed!');
      process.exit(0);
    }
    
  } catch (error: any) {
    console.error(`\n💥 Critical error: ${error.message}`);
    
    await sendMessage(
      `API Validation Critical Error!\n\n` +
      `Error: ${error.message}\n` +
      `Timestamp: ${new Date().toISOString()}`,
      process.env.DISCORD_WEBHOOK_URL,
      false
    );
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
