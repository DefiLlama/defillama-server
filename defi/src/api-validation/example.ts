import { BaseAPIValidator, BetaAPIComparator, APIValidator } from './index';

/**
 * Example usage of the DeFiLlama API validation system
 */

async function runExamples() {
    console.log('🚀 DeFiLlama API Validation Examples');
    console.log('='.repeat(50));

    // Example 1: Basic API validation
    await exampleBasicValidation();

    // Example 2: Beta API comparison
    await exampleBetaComparison();

    // Example 3: Custom validation
    await exampleCustomValidation();
}

async function exampleBasicValidation() {
    console.log('\n📋 Example 1: Basic API Validation');
    console.log('-'.repeat(40));

    try {
        const validator = new BaseAPIValidator({
            baseUrl: 'https://api.llama.fi',
            outputDir: './example-reports',
            validationOptions: {
                strict: false,
                validateNumericalTolerance: true,
                tolerancePercentage: 5
            }
        });

        const report = await validator.runValidation();
        validator.printSummary(report);

        console.log(`✅ Validation completed with ${report.summary.passedEndpoints}/${report.summary.totalEndpoints} endpoints passing`);
    } catch (error) {
        console.error('❌ Basic validation failed:', error);
    }
}

async function exampleBetaComparison() {
    console.log('\n🧪 Example 2: Beta API Comparison');
    console.log('-'.repeat(40));

    try {
        // Note: Replace with actual beta API URL when available
        const comparator = new BetaAPIComparator({
            baseUrl: 'https://api.llama.fi',
            betaUrl: 'https://api.llama.fi', // Replace with actual beta URL
            outputDir: './example-reports',
            numericalTolerance: 15, // 15% tolerance for testing
            maxArrayItemsToCompare: 5
        });

        const report = await comparator.runComparison();
        comparator.printSummary(report);

        console.log(`✅ Comparison completed with ${report.summary.passedEndpoints}/${report.summary.totalEndpoints} endpoints passing`);
    } catch (error) {
        console.error('❌ Beta comparison failed:', error);
    }
}

async function exampleCustomValidation() {
    console.log('\n⚙️  Example 3: Custom Validation');
    console.log('-'.repeat(40));

    try {
        const validator = new APIValidator({
            strict: true,
            allowAdditionalProperties: false
        });

        // Example data to validate
        const sampleProtocol = {
            id: 'uniswap',
            name: 'Uniswap',
            tvl: 1000000,
            timestamp: Date.now(),
            chains: ['ethereum', 'polygon'],
            category: 'DEX'
        };

        const result = validator.validateEndpoint('/protocol/uniswap', sampleProtocol);

        console.log('Custom validation result:');
        console.log(`  Valid: ${result.isValid}`);
        console.log(`  Errors: ${result.errors.length}`);
        console.log(`  Warnings: ${result.warnings.length}`);

        if (result.errors.length > 0) {
            console.log('  Error details:');
            result.errors.forEach(error => console.log(`    - ${error}`));
        }
    } catch (error) {
        console.error('❌ Custom validation failed:', error);
    }
}

// Example of programmatic usage
export async function validateSpecificEndpoints(endpoints: string[], baseUrl: string) {
    const validator = new BaseAPIValidator({
        baseUrl,
        endpoints,
        validationOptions: {
            validateNumericalTolerance: true,
            tolerancePercentage: 10
        }
    });

    return await validator.runValidation();
}

export async function compareAPIs(baseUrl: string, betaUrl: string, tolerance: number = 10) {
    const comparator = new BetaAPIComparator({
        baseUrl,
        betaUrl,
        numericalTolerance: tolerance,
        maxArrayItemsToCompare: 10
    });

    return await comparator.runComparison();
}

// Run examples if this file is executed directly
if (require.main === module) {
    runExamples().catch(console.error);
}

export default {
    runExamples,
    validateSpecificEndpoints,
    compareAPIs
};
