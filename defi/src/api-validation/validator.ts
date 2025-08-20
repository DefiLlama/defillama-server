import Ajv from 'ajv';
import { JSONSchema7 } from 'json-schema';
import { schemas, endpointSchemas } from './schemas';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    schemaUsed: string;
    endpoint: string;
    timestamp: number;
}

export interface ValidationOptions {
    strict?: boolean;
    allowAdditionalProperties?: boolean;
    validateNumericalTolerance?: boolean;
    tolerancePercentage?: number;
}

export class APIValidator {
    private ajv: Ajv;
    private schemas: Record<string, JSONSchema7>;

    constructor(options: ValidationOptions = {}) {
        this.ajv = new Ajv({
            allErrors: true,
            verbose: true,
            strict: options.strict ?? false,
            allowAdditionalProperties: options.allowAdditionalProperties ?? false
        });

        this.schemas = {
            ...schemas,
            ...endpointSchemas
        };

        // Add all schemas to Ajv
        Object.entries(this.schemas).forEach(([name, schema]) => {
            this.ajv.addSchema(schema, name);
        });
    }

    /**
     * Validate a response against a specific endpoint schema
     */
    validateEndpoint(endpoint: string, data: any, options: ValidationOptions = {}): ValidationResult {
        const timestamp = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];

        // Find the appropriate schema for the endpoint
        const schema = this.findSchemaForEndpoint(endpoint);
        if (!schema) {
            return {
                isValid: false,
                errors: [`No schema found for endpoint: ${endpoint}`],
                warnings: [],
                schemaUsed: 'unknown',
                endpoint,
                timestamp
            };
        }

        // Validate against schema
        const validate = this.ajv.compile(schema);
        const isValid = validate(data);

        if (!isValid && validate.errors) {
            errors.push(...validate.errors.map(err =>
                `${err.instancePath || 'root'}: ${err.message}`
            ));
        }

        // Additional validation checks
        if (options.validateNumericalTolerance) {
            const toleranceWarnings = this.validateNumericalTolerance(data, options.tolerancePercentage ?? 10);
            warnings.push(...toleranceWarnings);
        }

        // Check for required fields
        const requiredFieldWarnings = this.validateRequiredFields(data, schema);
        warnings.push(...requiredFieldWarnings);

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            schemaUsed: schema.$id || 'unknown',
            endpoint,
            timestamp
        };
    }

    /**
     * Validate multiple endpoints and return comprehensive results
     */
    validateMultipleEndpoints(endpoints: Array<{ endpoint: string; data: any }>, options: ValidationOptions = {}): ValidationResult[] {
        return endpoints.map(({ endpoint, data }) =>
            this.validateEndpoint(endpoint, data, options)
        );
    }

    /**
     * Find the appropriate schema for a given endpoint
     */
    private findSchemaForEndpoint(endpoint: string): JSONSchema7 | null {
        // Direct match
        if (this.schemas[endpoint]) {
            return this.schemas[endpoint];
        }

        // Pattern matching for parameterized endpoints
        for (const [pattern, schema] of Object.entries(endpointSchemas)) {
            if (this.matchesPattern(endpoint, pattern)) {
                return schema;
            }
        }

        return null;
    }

    /**
     * Check if an endpoint matches a pattern (e.g., /protocol/:name)
     */
    private matchesPattern(endpoint: string, pattern: string): boolean {
        const patternParts = pattern.split('/');
        const endpointParts = endpoint.split('/');

        if (patternParts.length !== endpointParts.length) {
            return false;
        }

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i].startsWith(':')) {
                // Parameter placeholder, skip validation
                continue;
            }
            if (patternParts[i] !== endpointParts[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate numerical values within tolerance
     */
    private validateNumericalTolerance(data: any, tolerancePercentage: number): string[] {
        const warnings: string[] = [];
        const tolerance = tolerancePercentage / 100;

        const checkNumericalValue = (value: any, path: string) => {
            if (typeof value === 'number' && !isNaN(value)) {
                if (value < 0 && path.includes('tvl')) {
                    warnings.push(`${path}: TVL value is negative (${value})`);
                }
                if (value > 1e12 && path.includes('tvl')) {
                    warnings.push(`${path}: TVL value seems unusually high (${value})`);
                }
            }
        };

        const traverse = (obj: any, path = '') => {
            if (obj && typeof obj === 'object') {
                for (const [key, value] of Object.entries(obj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    checkNumericalValue(value, currentPath);

                    if (Array.isArray(value)) {
                        value.forEach((item, index) => {
                            traverse(item, `${currentPath}[${index}]`);
                        });
                    } else if (value && typeof value === 'object') {
                        traverse(value, currentPath);
                    }
                }
            }
        };

        traverse(data);
        return warnings;
    }

    /**
     * Validate required fields are present
     */
    private validateRequiredFields(data: any, schema: JSONSchema7): string[] {
        const warnings: string[] = [];

        if (schema.required) {
            for (const requiredField of schema.required) {
                if (data[requiredField] === undefined || data[requiredField] === null) {
                    warnings.push(`Missing required field: ${requiredField}`);
                }
            }
        }

        return warnings;
    }

    /**
     * Get all available schemas
     */
    getAvailableSchemas(): string[] {
        return Object.keys(this.schemas);
    }

    /**
     * Add a custom schema
     */
    addSchema(name: string, schema: JSONSchema7): void {
        this.schemas[name] = schema;
        this.ajv.addSchema(schema, name);
    }

    /**
     * Remove a schema
     */
    removeSchema(name: string): void {
        delete this.schemas[name];
        this.ajv.removeSchema(name);
    }
}

export default APIValidator;
