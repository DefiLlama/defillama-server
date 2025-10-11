// Core validation components
export { default as APIValidator, ValidationResult, ValidationOptions } from './validator';
export { default as BaseAPIValidator, ValidationReport } from './base-api-validator';
export { default as BetaAPIComparator, ComparisonReport, ComparisonResult } from './beta-api-comparator';

// Notification system
export { default as DiscordNotifier, DiscordNotificationOptions } from './notifications';

// Schema definitions
export { default as schemas, endpointSchemas } from './schemas';

// Configuration
export { default as config, loadConfig, getValidationConfig, validateConfig, printConfig } from './config';

// CLI interface
export { default as cli } from './cli';

// Re-export types for convenience
export type {
    ValidationResult,
    ValidationOptions,
    ValidationReport,
    ComparisonReport,
    ComparisonResult,
    DiscordNotificationOptions
} from './validator';
