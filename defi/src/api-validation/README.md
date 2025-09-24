# DeFiLlama API Validation System

A comprehensive API structure validation and testing system for DeFiLlama that ensures API consistency across base and beta versions.

## 🎯 Objectives

- **Define standardized structure** for all public-facing API outputs
- **Implement automated validation** and monitoring system
- **Ensure API consistency** across base and beta versions
- **Provide comprehensive reporting** with Discord notifications

## 🏗️ Architecture

```
src/api-validation/
├── schemas/           # JSON schema definitions
├── validator.ts       # Core validation engine
├── notifications.ts   # Discord notification system
├── base-api-validator.ts    # Base API validation
├── beta-api-comparator.ts   # Beta API comparison
├── cli.ts            # Command-line interface
├── example.ts        # Usage examples
├── index.ts          # Main exports
└── jenkins/          # Jenkins pipeline configuration
```

## 🚀 Quick Start

### Installation

```bash
cd defi
npm install ajv json-schema commander
```

### Basic Usage

```bash
# Validate base API
npm run api-validate validate

# Compare beta API with base API
npm run api-validate compare --base https://api.llama.fi --beta https://beta-api.llama.fi

# List available schemas
npm run api-validate schemas

# Health check
npm run api-validate health
```

## 📋 Features

### 1. Base API Validation
- **Comprehensive structure checks** against defined JSON schemas
- **Detailed validation reports** with error categorization
- **Discord notifications** for failures and warnings
- **Configurable validation options** (strict mode, tolerance, etc.)

### 2. Beta API Comparison
- **Schema validation** for beta API responses
- **Numerical field comparison** with configurable tolerance (default: 10%)
- **Array structure analysis** (first 10, last 10, random 10 items)
- **Comprehensive difference reporting**

### 3. Automated Monitoring
- **Jenkins pipeline** for hourly validation runs
- **Discord webhook integration** for real-time notifications
- **Report archiving** and cleanup
- **Configurable scheduling**

## 🔧 Configuration

### Environment Variables

```bash
# Discord notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# API endpoints
API_BASE_URL=https://api.llama.fi
BETA_API_URL=https://beta-api.llama.fi

# Output settings
VALIDATION_OUTPUT_DIR=./validation-reports
```

### Validation Options

```typescript
interface ValidationOptions {
  strict?: boolean;                    // Enable strict validation
  allowAdditionalProperties?: boolean; // Allow extra fields
  validateNumericalTolerance?: boolean; // Check numerical values
  tolerancePercentage?: number;        // Tolerance percentage (default: 10%)
}
```

## 📊 Schema Definitions

### Supported Endpoints

- `/protocols` - Protocol list
- `/chains` - Chain information
- `/cexs` - Centralized exchanges
- `/treasuries` - Treasury data
- `/entities` - Entity information
- `/raises` - Funding rounds
- `/hacks` - Security incidents
- `/oracles` - Oracle data
- `/forks` - Protocol forks
- `/categories` - Protocol categories
- `/langs` - Language support

### Schema Structure

Each endpoint has a defined JSON schema that specifies:
- **Required fields** and their types
- **Data validation rules**
- **Nested object structures**
- **Array constraints**

## 🖥️ CLI Commands

### Validate Command

```bash
npm run api-validate validate [options]

Options:
  -u, --url <url>              Base API URL
  -d, --discord <webhook>      Discord webhook URL
  -o, --output <dir>           Output directory
  -e, --endpoints <list>       Comma-separated endpoints
  -t, --timeout <ms>           Request timeout
  -r, --retries <count>        Retry attempts
  --strict                     Strict validation mode
  --validate-numerical         Validate numerical values
  --tolerance <percentage>     Numerical tolerance
```

### Compare Command

```bash
npm run api-validate compare [options]

Required Options:
  -b, --base <url>            Base API URL
  -t, --beta <url>            Beta API URL

Additional Options:
  -d, --discord <webhook>     Discord webhook URL
  -o, --output <dir>          Output directory
  --tolerance <percentage>    Numerical tolerance
  --max-array-items <count>   Max array items to compare
```

## 🔌 Programmatic Usage

### Basic Validation

```typescript
import { BaseAPIValidator } from './src/api-validation';

const validator = new BaseAPIValidator({
  baseUrl: 'https://api.llama.fi',
  discordWebhookUrl: 'your-webhook-url',
  validationOptions: {
    strict: true,
    validateNumericalTolerance: true,
    tolerancePercentage: 5
  }
});

const report = await validator.runValidation();
console.log(`Validation completed: ${report.summary.passedEndpoints}/${report.summary.totalEndpoints} passed`);
```

### Beta API Comparison

```typescript
import { BetaAPIComparator } from './src/api-validation';

const comparator = new BetaAPIComparator({
  baseUrl: 'https://api.llama.fi',
  betaUrl: 'https://beta-api.llama.fi',
  numericalTolerance: 15,
  maxArrayItemsToCompare: 20
});

const report = await comparator.runComparison();
console.log(`Comparison completed: ${report.summary.passedEndpoints}/${report.summary.totalEndpoints} passed`);
```

### Custom Validation

```typescript
import { APIValidator } from './src/api-validation';

const validator = new APIValidator({
  strict: false,
  allowAdditionalProperties: true
});

const result = validator.validateEndpoint('/custom/endpoint', data);
if (!result.isValid) {
  console.log('Validation errors:', result.errors);
}
```

## 🚦 Jenkins Integration

### Pipeline Features

- **Hourly execution** via cron trigger
- **Multi-stage pipeline** with proper error handling
- **Artifact archiving** for validation reports
- **Discord notifications** for success/failure
- **Automatic cleanup** of old reports

### Setup

1. **Create Jenkins Pipeline Job**
   - Use the provided `Jenkinsfile`
   - Configure credentials for Discord webhook

2. **Configure Credentials**
   - Add `discord-webhook-url` credential in Jenkins
   - Set environment variables as needed

3. **Schedule Execution**
   - Default: Every hour (`0 * * * *`)
   - Customizable via cron syntax

### Pipeline Stages

1. **Setup** - Environment preparation
2. **Install Dependencies** - Node.js and npm packages
3. **Run Base API Validation** - Core validation logic
4. **Run Beta API Comparison** - Beta API testing
5. **Generate Reports** - Report compilation
6. **Archive Results** - Artifact storage
7. **Cleanup** - Temporary file removal

## 📈 Monitoring and Alerts

### Discord Notifications

- **Success notifications** when all validations pass
- **Failure alerts** with detailed error information
- **Warning notifications** for non-critical issues
- **Configurable notification levels**

### Report Types

- **Validation Reports** - Base API validation results
- **Comparison Reports** - Beta API comparison results
- **Summary Reports** - High-level overview
- **Archived Reports** - Historical data preservation

## 🛠️ Development

### Adding New Schemas

1. **Define schema** in `schemas/index.ts`
2. **Add endpoint mapping** in `endpointSchemas`
3. **Update validation logic** if needed
4. **Test with example data**

### Extending Validation

1. **Modify `APIValidator` class** for new validation rules
2. **Add new validation options** to interfaces
3. **Update CLI commands** for new features
4. **Extend reporting** for new validation types

### Testing

```bash
# Run examples
npm run api-validate example

# Test specific endpoints
npm run api-validate validate --endpoints /protocols,/chains

# Test with custom tolerance
npm run api-validate validate --tolerance 5 --validate-numerical
```

## 📝 Troubleshooting

### Common Issues

1. **Schema Validation Failures**
   - Check schema definitions in `schemas/index.ts`
   - Verify API response structure matches schema
   - Use `--allow-additional` for flexible validation

2. **Discord Notifications Not Working**
   - Verify webhook URL is correct
   - Check webhook permissions
   - Test with simple message first

3. **Jenkins Pipeline Failures**
   - Check Node.js version compatibility
   - Verify credential configuration
   - Review pipeline logs for specific errors

### Debug Mode

```bash
# Enable verbose logging
DEBUG=* npm run api-validate validate

# Test specific validation
npm run api-validate validate --endpoints /protocols --strict
```

## 🤝 Contributing

### Code Style

- **TypeScript** with strict type checking
- **ESLint** and **Prettier** for code formatting
- **JSDoc** comments for public APIs
- **Error handling** with proper logging

### Testing Strategy

- **Unit tests** for validation logic
- **Integration tests** for API endpoints
- **Schema validation** tests
- **CLI command** testing

## 📚 Additional Resources

- [JSON Schema Specification](https://json-schema.org/)
- [Ajv Validation Library](https://ajv.js.org/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Discord Webhook API](https://discord.com/developers/docs/resources/webhook)

## 📄 License

This project is part of the DeFiLlama ecosystem and follows the same licensing terms.

---

For questions or issues, please open an issue in the DeFiLlama repository or contact the development team.
