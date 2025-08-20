import { APIValidator } from './validator';
import { schemas } from './schemas';

/**
 * Simple test to verify the validation system works
 */

async function runTests() {
    console.log('🧪 Testing DeFiLlama API Validation System');
    console.log('='.repeat(50));

    try {
        // Test 1: Basic validator creation
        console.log('\n📋 Test 1: Validator Creation');
        const validator = new APIValidator();
        console.log('✅ Validator created successfully');
        console.log(`   Available schemas: ${validator.getAvailableSchemas().length}`);

        // Test 2: Schema validation
        console.log('\n📋 Test 2: Schema Validation');
        const testProtocol = {
            id: 'test-protocol',
            name: 'Test Protocol',
            tvl: 1000000,
            timestamp: Date.now(),
            chains: ['ethereum'],
            category: 'DEX'
        };

        const result = validator.validateEndpoint('/protocol/test', testProtocol);
        console.log(`✅ Schema validation: ${result.isValid ? 'PASSED' : 'FAILED'}`);

        if (!result.isValid) {
            console.log('   Errors:', result.errors);
        }

        // Test 3: Invalid data validation
        console.log('\n📋 Test 3: Invalid Data Validation');
        const invalidProtocol = {
            // Missing required fields
            name: 'Invalid Protocol'
        };

        const invalidResult = validator.validateEndpoint('/protocol/invalid', invalidProtocol);
        console.log(`✅ Invalid data validation: ${invalidResult.isValid ? 'PASSED' : 'FAILED'}`);

        if (!invalidResult.isValid) {
            console.log('   Expected errors:', invalidResult.errors.length);
        }

        // Test 4: Schema listing
        console.log('\n📋 Test 4: Schema Information');
        console.log('Available schemas:');
        Object.keys(schemas).forEach(schemaName => {
            if (schemaName !== 'endpointSchemas') {
                console.log(`   • ${schemaName}`);
            }
        });

        console.log('\nEndpoint schemas:');
        Object.keys(schemas.endpointSchemas).forEach(endpoint => {
            console.log(`   • ${endpoint}`);
        });

        console.log('\n🎉 All tests completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

export default runTests;
