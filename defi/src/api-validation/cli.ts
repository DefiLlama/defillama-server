#!/usr/bin/env node

import { Command } from 'commander';
import BaseAPIValidator from './base-api-validator';
import BetaAPIComparator from './beta-api-comparator';
import { ValidationOptions } from './validator';

const program = new Command();

program
    .name('defillama-api-validator')
    .description('DeFiLlama API Structure Validation and Testing Tool')
    .version('1.0.0');

// Base API Validation Command
program
    .command('validate')
    .description('Validate base API endpoints against defined schemas')
    .option('-u, --url <url>', 'Base API URL', 'https://api.llama.fi')
    .option('-d, --discord <webhook>', 'Discord webhook URL for notifications')
    .option('-o, --output <dir>', 'Output directory for reports', './validation-reports')
    .option('-e, --endpoints <endpoints>', 'Comma-separated list of endpoints to validate')
    .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
    .option('-r, --retries <count>', 'Number of retry attempts', '3')
    .option('--strict', 'Enable strict validation mode')
    .option('--allow-additional', 'Allow additional properties in responses')
    .option('--validate-numerical', 'Validate numerical values within tolerance')
    .option('--tolerance <percentage>', 'Numerical tolerance percentage', '10')
    .action(async (options) => {
        try {
            console.log('🔍 DeFiLlama Base API Validator');
            console.log('='.repeat(50));

            const validationOptions: ValidationOptions = {
                strict: options.strict,
                allowAdditionalProperties: options.allowAdditional,
                validateNumericalTolerance: options.validateNumerical,
                tolerancePercentage: parseFloat(options.tolerance)
            };

            const validator = new BaseAPIValidator({
                baseUrl: options.url,
                discordWebhookUrl: options.discord,
                outputDir: options.output,
                validationOptions,
                endpoints: options.endpoints ? options.endpoints.split(',') : undefined,
                timeout: parseInt(options.timeout),
                retries: parseInt(options.retries)
            });

            const report = await validator.runValidation();
            validator.printSummary(report);

            process.exit(report.summary.failedEndpoints > 0 ? 1 : 0);
        } catch (error) {
            console.error('❌ Validation failed:', error);
            process.exit(1);
        }
    });

// Beta API Comparison Command
program
    .command('compare')
    .description('Compare beta API responses with base API')
    .requiredOption('-b, --base <url>', 'Base API URL')
    .requiredOption('-t, --beta <url>', 'Beta API URL')
    .option('-d, --discord <webhook>', 'Discord webhook URL for notifications')
    .option('-o, --output <dir>', 'Output directory for reports', './validation-reports')
    .option('-e, --endpoints <endpoints>', 'Comma-separated list of endpoints to compare')
    .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
    .option('-r, --retries <count>', 'Number of retry attempts', '3')
    .option('--tolerance <percentage>', 'Numerical tolerance percentage', '10')
    .option('--max-array-items <count>', 'Maximum array items to compare', '10')
    .option('--strict', 'Enable strict validation mode')
    .option('--allow-additional', 'Allow additional properties in responses')
    .action(async (options) => {
        try {
            console.log('🧪 DeFiLlama Beta API Comparator');
            console.log('='.repeat(50));

            const validationOptions: ValidationOptions = {
                strict: options.strict,
                allowAdditionalProperties: options.allowAdditional
            };

            const comparator = new BetaAPIComparator({
                baseUrl: options.base,
                betaUrl: options.beta,
                discordWebhookUrl: options.discord,
                outputDir: options.output,
                validationOptions,
                endpoints: options.endpoints ? options.endpoints.split(',') : undefined,
                timeout: parseInt(options.timeout),
                retries: parseInt(options.retries),
                numericalTolerance: parseFloat(options.tolerance),
                maxArrayItemsToCompare: parseInt(options.maxArrayItems)
            });

            const report = await comparator.runComparison();
            comparator.printSummary(report);

            process.exit(report.summary.failedEndpoints > 0 ? 1 : 0);
        } catch (error) {
            console.error('❌ Comparison failed:', error);
            process.exit(1);
        }
    });

// List Available Schemas Command
program
    .command('schemas')
    .description('List all available validation schemas')
    .action(() => {
        const { schemas } = require('./schemas');
        console.log('📚 Available Validation Schemas');
        console.log('='.repeat(40));

        Object.keys(schemas).forEach(schemaName => {
            if (schemaName !== 'endpointSchemas') {
                console.log(`• ${schemaName}`);
            }
        });

        console.log('\n🔗 Endpoint Schemas:');
        Object.keys(schemas.endpointSchemas).forEach(endpoint => {
            console.log(`• ${endpoint}`);
        });
    });

// Health Check Command
program
    .command('health')
    .description('Quick health check of the validation system')
    .option('-u, --url <url>', 'API URL to check', 'https://api.llama.fi')
    .action(async (options) => {
        try {
            console.log('🏥 DeFiLlama API Health Check');
            console.log('='.repeat(40));
            console.log(`Checking: ${options.url}`);

            const startTime = Date.now();
            const response = await fetch(`${options.url}/protocols`);
            const endTime = Date.now();

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Status: ${response.status} ${response.statusText}`);
                console.log(`⏱️  Response Time: ${endTime - startTime}ms`);
                console.log(`📊 Protocols Count: ${data.protocols?.length || 'Unknown'}`);
                console.log(`🔗 Content-Type: ${response.headers.get('content-type')}`);
            } else {
                console.log(`❌ Status: ${response.status} ${response.statusText}`);
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Health check failed:', error);
            process.exit(1);
        }
    });

// Help command
program
    .command('help')
    .description('Show detailed help information')
    .action(() => {
        console.log(`
🔍 DeFiLlama API Validator - Help

USAGE:
  npm run api-validate [command] [options]

COMMANDS:
  validate              Validate base API endpoints
  compare               Compare beta API with base API
  schemas               List available validation schemas
  health                Quick health check
  help                  Show this help message

EXAMPLES:

1. Validate base API:
   npm run api-validate validate

2. Validate with custom options:
   npm run api-validate validate --url https://api.llama.fi --strict --validate-numerical

3. Compare beta API:
   npm run api-validate compare --base https://api.llama.fi --beta https://beta-api.llama.fi

4. Quick health check:
   npm run api-validate health

OPTIONS:
  -u, --url <url>              API base URL
  -d, --discord <webhook>      Discord webhook for notifications
  -o, --output <dir>           Output directory for reports
  -e, --endpoints <list>       Comma-separated endpoints
  -t, --timeout <ms>           Request timeout
  -r, --retries <count>        Retry attempts
  --strict                     Strict validation mode
  --allow-additional           Allow additional properties
  --validate-numerical         Validate numerical values
  --tolerance <percentage>     Numerical tolerance (default: 10%)

ENVIRONMENT VARIABLES:
  DISCORD_WEBHOOK_URL          Discord webhook URL
  API_BASE_URL                 Default API base URL
  VALIDATION_OUTPUT_DIR        Default output directory

For more information, visit: https://github.com/DefiLlama/defillama-server
    `);
    });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.help();
}
