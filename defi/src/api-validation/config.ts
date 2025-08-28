import { config } from 'dotenv';

// Load environment variables from .env file
config();

export interface ValidationConfig {
    // API endpoints
    baseApiUrl: string;
    betaApiUrl?: string;

    // Discord configuration
    discordWebhookUrl?: string;

    // Output configuration
    outputDir: string;

    // Validation options
    strictMode: boolean;
    allowAdditionalProperties: boolean;
    validateNumericalTolerance: boolean;
    tolerancePercentage: number;

    // Request configuration
    timeout: number;
    retries: number;

    // Array comparison
    maxArrayItemsToCompare: number;

    // Jenkins configuration
    jenkinsEnabled: boolean;
    jenkinsSchedule: string;
}

/**
 * Load configuration from environment variables with sensible defaults
 */
export function loadConfig(): ValidationConfig {
    return {
        // API endpoints
        baseApiUrl: process.env.API_BASE_URL || 'https://api.llama.fi',
        betaApiUrl: process.env.BETA_API_URL,

        // Discord configuration
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,

        // Output configuration
        outputDir: process.env.VALIDATION_OUTPUT_DIR || './validation-reports',

        // Validation options
        strictMode: process.env.VALIDATION_STRICT === 'true',
        allowAdditionalProperties: process.env.VALIDATION_ALLOW_ADDITIONAL === 'true',
        validateNumericalTolerance: process.env.VALIDATION_NUMERICAL !== 'false',
        tolerancePercentage: parseFloat(process.env.VALIDATION_TOLERANCE || '10'),

        // Request configuration
        timeout: parseInt(process.env.VALIDATION_TIMEOUT || '30000'),
        retries: parseInt(process.env.VALIDATION_RETRIES || '3'),

        // Array comparison
        maxArrayItemsToCompare: parseInt(process.env.VALIDATION_MAX_ARRAY_ITEMS || '10'),

        // Jenkins configuration
        jenkinsEnabled: process.env.JENKINS_ENABLED === 'true',
        jenkinsSchedule: process.env.JENKINS_SCHEDULE || '0 * * * *' // Every hour
    };
}

/**
 * Get configuration for specific validation type
 */
export function getValidationConfig(type: 'base' | 'beta'): Partial<ValidationConfig> {
    const config = loadConfig();

    if (type === 'base') {
        return {
            baseApiUrl: config.baseApiUrl,
            discordWebhookUrl: config.discordWebhookUrl,
            outputDir: config.outputDir,
            strictMode: config.strictMode,
            allowAdditionalProperties: config.allowAdditionalProperties,
            validateNumericalTolerance: config.validateNumericalTolerance,
            tolerancePercentage: config.tolerancePercentage,
            timeout: config.timeout,
            retries: config.retries
        };
    } else {
        return {
            baseApiUrl: config.baseApiUrl,
            betaApiUrl: config.betaApiUrl,
            discordWebhookUrl: config.discordWebhookUrl,
            outputDir: config.outputDir,
            strictMode: config.strictMode,
            allowAdditionalProperties: config.allowAdditionalProperties,
            timeout: config.timeout,
            retries: config.retries,
            tolerancePercentage: config.tolerancePercentage,
            maxArrayItemsToCompare: config.maxArrayItemsToCompare
        };
    }
}

/**
 * Validate configuration and return any issues
 */
export function validateConfig(config: ValidationConfig): string[] {
    const issues: string[] = [];

    if (!config.baseApiUrl) {
        issues.push('Base API URL is required');
    }

    if (config.tolerancePercentage < 0 || config.tolerancePercentage > 100) {
        issues.push('Tolerance percentage must be between 0 and 100');
    }

    if (config.timeout < 1000) {
        issues.push('Timeout must be at least 1000ms');
    }

    if (config.retries < 0 || config.retries > 10) {
        issues.push('Retries must be between 0 and 10');
    }

    if (config.maxArrayItemsToCompare < 1 || config.maxArrayItemsToCompare > 100) {
        issues.push('Max array items to compare must be between 1 and 100');
    }

    return issues;
}

/**
 * Print configuration summary
 */
export function printConfig(config: ValidationConfig): void {
    console.log('⚙️  Validation Configuration');
    console.log('='.repeat(40));
    console.log(`Base API: ${config.baseApiUrl}`);
    console.log(`Beta API: ${config.betaApiUrl || 'Not configured'}`);
    console.log(`Discord: ${config.discordWebhookUrl ? 'Configured' : 'Not configured'}`);
    console.log(`Output Dir: ${config.outputDir}`);
    console.log(`Strict Mode: ${config.strictMode}`);
    console.log(`Allow Additional: ${config.allowAdditionalProperties}`);
    console.log(`Numerical Validation: ${config.validateNumericalTolerance}`);
    console.log(`Tolerance: ±${config.tolerancePercentage}%`);
    console.log(`Timeout: ${config.timeout}ms`);
    console.log(`Retries: ${config.retries}`);
    console.log(`Max Array Items: ${config.maxArrayItemsToCompare}`);
    console.log(`Jenkins: ${config.jenkinsEnabled ? 'Enabled' : 'Disabled'}`);

    if (config.jenkinsEnabled) {
        console.log(`Schedule: ${config.jenkinsSchedule}`);
    }
}

export default {
    loadConfig,
    getValidationConfig,
    validateConfig,
    printConfig
};
