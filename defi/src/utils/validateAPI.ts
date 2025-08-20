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

interface ValidationReport {
  timestamp: string;
  apiType: 'free' | 'pro';
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageResponseTime: number;
  };
  results: ValidationResult[];
  failedEndpoints: string[];
}

async function validateAllEndpoints(
  apiType: 'free' | 'pro' = 'free',
  specificEndpoint?: string,
  specificDomain?: string,
  isDebug: boolean = false,
  retryCount: number = 3,
  retryDelay: number = 1000,
  requestDelay: number = 500,
  requestTimeout: number = 45000
): Promise<ValidationReport> {
  console.log(`validating ${apiType} API...`);
  
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
    
    console.log(`testing ${endpoints.length} endpoints...`);
    
    const results: ValidationResult[] = [];
    const totalResponseTimes: number[] = [];
    
    for (const [index, endpoint] of endpoints.entries()) {
      const progress = ((index + 1) / endpoints.length * 100).toFixed(1);
      process.stdout.write(`\rprogress: ${progress}% (${index + 1}/${endpoints.length}) - Testing ${endpoint.path}`);
      
      try {
        const result = await testEndpoint(endpoint, isDebug, retryCount, retryDelay, requestTimeout);
        results.push(result);
        
        if (result.responseTime) {
          totalResponseTimes.push(result.responseTime);
        }
        
        if (result.status === 'fail') {
          const displayPath = buildEndpointDisplayPath(result.endpoint, result.queryParams);
          console.log(`\nfailed: ${displayPath} on ${sanitizeUrlForDisplay(endpoint.serverUrl)}`);
          result.errors.forEach(error => console.log(`   • ${error}`));
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
        console.log(`\nerror: ${displayPath} - ${error.message}`);
      }
    }
    
    console.log('\n'); 
    
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const averageResponseTime = totalResponseTimes.length > 0 
      ? Math.round(totalResponseTimes.reduce((a, b) => a + b, 0) / totalResponseTimes.length)
      : 0;
    
    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      apiType,
      summary: {
        total: results.length,
        passed,
        failed,
        averageResponseTime
      },
      results,
      failedEndpoints: results
        .filter(r => r.status === 'fail')
        .map(r => `${r.serverUrl}${buildEndpointDisplayPath(r.endpoint, r.queryParams)}`)
    };
    
    return report;
    
  } catch (error: any) {
    console.error('error during validation:', error.message);
    throw error;
  }
}

async function generateReport(report: ValidationReport, outputFile?: string): Promise<void> {
  const { summary, failedEndpoints, apiType } = report;
  
  console.log('\nvalidation summary');
  console.log('='.repeat(50));
  console.log(`api: ${apiType}`);
  console.log(`total endpoints: ${summary.total}`);
  console.log(`passed: ${summary.passed}`);
  console.log(`failed: ${summary.failed}`);
  console.log(`avg resp time: ${summary.averageResponseTime}ms`);
  console.log(`success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
  
  if (failedEndpoints.length > 0) {
    console.log('\nFAILED ENDPOINTS:');
    failedEndpoints.forEach((endpoint, index) => {
      console.log(`${index + 1}. ${sanitizeUrlForDisplay(endpoint)}`);
    });
  }
  
  const reportFile = outputFile || path.join(__dirname, '../validation_report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\nfull report saved to: ${reportFile}`);
}

async function sendNotification(report: ValidationReport, isDryRun: boolean = false): Promise<void> {
  const { summary, failedEndpoints, apiType } = report;
  
  if (summary.failed === 0) {
    console.log('\neverything isoke');
    return;
  }
  
 const failureMessage = "```" +
  `api validation error\n\n` +
  `${apiType} api:\n` +
  `• total endpoints: ${summary.total}\n` +
  `• pass: ${summary.passed}\n` +
  `• fail: ${summary.failed}\n` +
  `• success rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%\n` +
  `• avg resp time: ${summary.averageResponseTime}ms\n\n` +
  `failed endpoints (${Math.min(failedEndpoints.length, 10)} of ${failedEndpoints.length}):\n` +
  failedEndpoints.slice(0, 20).map((endpoint, i) => `${i + 1}. ${sanitizeUrlForDisplay(endpoint)}`).join('\n') +
  (failedEndpoints.length > 20 ? `\n... and ${failedEndpoints.length - 10} more` : '') +
  `\n\n${report.timestamp}` +
  "```";
  
  console.log('\nsend discord notification');
  
  if (!isDryRun) {
    await sendMessage(failureMessage, process.env.DISCORD_WEBHOOK_URL, false);
  } else {
    console.log('would send:\n', failureMessage);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  let apiType: 'free' | 'pro' = 'free';
  let specificEndpoint: string | undefined;
  let specificDomain: string | undefined;
  let outputFile: string | undefined;
  let isDryRun = false;
  let isDebug = false;
  let retryCount = 3;
  let retryDelay = 1000;
  let requestDelay = 500;
  let requestTimeout = 45000;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--api-type':
        apiType = args[++i] as 'free' | 'pro';
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
      case '--debug':
        isDebug = true;
        break;
      case '--retry-count':
        retryCount = parseInt(args[++i]) || 3;
        break;
      case '--retry-delay':
        retryDelay = parseInt(args[++i]) || 1000;
        break;
      case '--request-delay':
        requestDelay = parseInt(args[++i]) || 500;
        break;
      case '--timeout':
        requestTimeout = parseInt(args[++i]) || 45000;
        break;
      case '--help':
        console.log(`
Usage: npx ts-node validate-base.ts [options]

Options:
  --api-type <free|pro>    API type to validate (default: free)
  --endpoint <pattern>     Filter endpoints containing this pattern
  --domain <domain>        Filter to specific domain (e.g., coins, stablecoins)
  --output <file>          Output file for JSON report
  --dry-run               Skip Discord notifications
  --debug                 Enable detailed debugging output
  --retry-count <number>  Number of retry attempts (default: 3)
  --retry-delay <ms>      Base delay between retries in ms (default: 1000)
  --request-delay <ms>    Delay between requests in ms (default: 500)
  --timeout <ms>          Request timeout in ms (default: 45000)
  --help                  Show this help message

Examples:
  npx ts-node validate-base.ts
  npx ts-node validate-base.ts --api-type pro
  npx ts-node validate-base.ts --endpoint protocols
  npx ts-node validate-base.ts --domain coins.llama.fi
  npx ts-node validate-base.ts --dry-run
        `);
        process.exit(0);
    }
  }
  
  console.log('api validation\n');
  
  try {
    const report = await validateAllEndpoints(apiType, specificEndpoint, specificDomain, isDebug, retryCount, retryDelay, requestDelay, requestTimeout);
    await generateReport(report, outputFile);
    await sendNotification(report, isDryRun);
    
    if (report.summary.failed > 0) {
      console.log(`\nvalidation failed with ${report.summary.failed} endpoint failures`);
      process.exit(1);
    } else {
      console.log('\nall validations passed');
      process.exit(0);
    }
    
  } catch (error: any) {
    console.error(`\ncritical error: ${error.message}`);
    
    if (!isDryRun) {
      await sendMessage(
        `api validation error!\n\n` +
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