import fetch from 'node-fetch';
import { APIValidator, ValidationResult, ValidationOptions } from './validator';
import { DiscordNotifier } from './notifications';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface BaseAPIValidatorOptions {
    baseUrl?: string;
    discordWebhookUrl?: string;
    outputDir?: string;
    validationOptions?: ValidationOptions;
    endpoints?: string[];
    timeout?: number;
    retries?: number;
}

export interface ValidationReport {
    summary: {
        totalEndpoints: number;
        passedEndpoints: number;
        failedEndpoints: number;
        totalErrors: number;
        totalWarnings: number;
        timestamp: number;
        baseUrl: string;
    };
    results: ValidationResult[];
    recommendations: string[];
}

export class BaseAPIValidator {
    private validator: APIValidator;
    private notifier?: DiscordNotifier;
    private options: BaseAPIValidatorOptions;
    private defaultEndpoints = [
        '/protocols',
        '/chains',
        '/cexs',
        '/treasuries',
        '/entities',
        '/raises',
        '/hacks',
        '/oracles',
        '/forks',
        '/categories',
        '/langs'
    ];

    constructor(options: BaseAPIValidatorOptions = {}) {
        this.options = {
            baseUrl: 'https://api.llama.fi',
            outputDir: './validation-reports',
            timeout: 30000,
            retries: 3,
            ...options
        };

        this.validator = new APIValidator(this.options.validationOptions);

        if (this.options.discordWebhookUrl) {
            this.notifier = new DiscordNotifier({
                webhookUrl: this.options.discordWebhookUrl
            });
        }

        // Ensure output directory exists
        if (this.options.outputDir) {
            try {
                mkdirSync(this.options.outputDir, { recursive: true });
            } catch (error) {
                console.warn(`Could not create output directory: ${error}`);
            }
        }
    }

    /**
     * Run validation on all configured endpoints
     */
    async runValidation(): Promise<ValidationReport> {
        console.log(`🚀 Starting API validation for: ${this.options.baseUrl}`);
        console.log(`📋 Validating ${this.options.endpoints?.length || this.defaultEndpoints.length} endpoints...`);

        const endpoints = this.options.endpoints || this.defaultEndpoints;
        const results: ValidationResult[] = [];
        const startTime = Date.now();

        for (const endpoint of endpoints) {
            try {
                console.log(`\n🔍 Validating: ${endpoint}`);
                const data = await this.fetchEndpoint(endpoint);
                const result = this.validator.validateEndpoint(endpoint, data, this.options.validationOptions);
                results.push(result);

                if (result.isValid) {
                    console.log(`✅ ${endpoint}: PASSED`);
                    if (result.warnings.length > 0) {
                        console.log(`⚠️  Warnings: ${result.warnings.length}`);
                    }
                } else {
                    console.log(`❌ ${endpoint}: FAILED`);
                    console.log(`   Errors: ${result.errors.length}`);
                    result.errors.slice(0, 3).forEach(error => console.log(`   - ${error}`));
                }
            } catch (error) {
                console.error(`💥 Error validating ${endpoint}:`, error);
                results.push({
                    isValid: false,
                    errors: [`Request failed: ${error}`],
                    warnings: [],
                    schemaUsed: 'unknown',
                    endpoint,
                    timestamp: Date.now()
                });
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`\n⏱️  Validation completed in ${duration}ms`);

        const report = this.generateReport(results);
        await this.saveReport(report);

        if (this.notifier) {
            await this.notifier.sendValidationResults(results, this.options.baseUrl!);
        }

        return report;
    }

    /**
     * Fetch data from a specific endpoint
     */
    private async fetchEndpoint(endpoint: string): Promise<any> {
        const url = `${this.options.baseUrl}${endpoint}`;

        for (let attempt = 1; attempt <= this.options.retries!; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'DeFiLlama-API-Validator/1.0.0'
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data;
            } catch (error: any) {
                if (attempt === this.options.retries) {
                    throw error;
                }

                if (error.name === 'AbortError') {
                    console.warn(`⏰ Timeout on attempt ${attempt} for ${endpoint}, retrying...`);
                } else {
                    console.warn(`🔄 Attempt ${attempt} failed for ${endpoint}: ${error.message}, retrying...`);
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }

        throw new Error(`Failed to fetch ${endpoint} after ${this.options.retries} attempts`);
    }

    /**
     * Generate comprehensive validation report
     */
    private generateReport(results: ValidationResult[]): ValidationReport {
        const totalEndpoints = results.length;
        const passedEndpoints = results.filter(r => r.isValid).length;
        const failedEndpoints = totalEndpoints - passedEndpoints;
        const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
        const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

        const recommendations: string[] = [];

        if (failedEndpoints > 0) {
            recommendations.push(`Fix ${failedEndpoints} failed endpoints to ensure API reliability`);
        }

        if (totalWarnings > 0) {
            recommendations.push(`Review ${totalWarnings} warnings to improve data quality`);
        }

        if (failedEndpoints === 0 && totalWarnings === 0) {
            recommendations.push('All endpoints are working correctly. Consider adding more comprehensive validation rules.');
        }

        // Add specific recommendations based on common issues
        const commonIssues = this.analyzeCommonIssues(results);
        recommendations.push(...commonIssues);

        return {
            summary: {
                totalEndpoints,
                passedEndpoints,
                failedEndpoints,
                totalErrors,
                totalWarnings,
                timestamp: Date.now(),
                baseUrl: this.options.baseUrl!
            },
            results,
            recommendations
        };
    }

    /**
     * Analyze common issues and provide specific recommendations
     */
    private analyzeCommonIssues(results: ValidationResult[]): string[] {
        const recommendations: string[] = [];

        // Check for missing required fields
        const missingFields = results.filter(r =>
            r.errors.some(e => e.includes('Missing required field'))
        );
        if (missingFields.length > 0) {
            recommendations.push(`Review data structure for ${missingFields.length} endpoints with missing required fields`);
        }

        // Check for type mismatches
        const typeErrors = results.filter(r =>
            r.errors.some(e => e.includes('type') && e.includes('should be'))
        );
        if (typeErrors.length > 0) {
            recommendations.push(`Fix data type issues in ${typeErrors.length} endpoints`);
        }

        // Check for negative TVL values
        const negativeTvl = results.filter(r =>
            r.warnings.some(w => w.includes('TVL value is negative'))
        );
        if (negativeTvl.length > 0) {
            recommendations.push(`Investigate negative TVL values in ${negativeTvl.length} endpoints`);
        }

        return recommendations;
    }

    /**
     * Save validation report to file
     */
    private async saveReport(report: ValidationReport): Promise<void> {
        if (!this.options.outputDir) return;

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `validation-report-${timestamp}.json`;
            const filepath = join(this.options.outputDir, filename);

            writeFileSync(filepath, JSON.stringify(report, null, 2));
            console.log(`📄 Report saved to: ${filepath}`);
        } catch (error) {
            console.error('Failed to save report:', error);
        }
    }

    /**
     * Get validation statistics
     */
    getValidationStats(results: ValidationResult[]): Record<string, any> {
        const stats = {
            total: results.length,
            passed: results.filter(r => r.isValid).length,
            failed: results.filter(r => !r.isValid).length,
            errors: results.reduce((sum, r) => sum + r.errors.length, 0),
            warnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
            successRate: 0,
            averageErrors: 0,
            averageWarnings: 0
        };

        if (stats.total > 0) {
            stats.successRate = (stats.passed / stats.total) * 100;
            stats.averageErrors = stats.errors / stats.total;
            stats.averageWarnings = stats.warnings / stats.total;
        }

        return stats;
    }

    /**
     * Print validation summary to console
     */
    printSummary(report: ValidationReport): void {
        const stats = this.getValidationStats(report.results);

        console.log('\n📊 VALIDATION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Base URL: ${report.summary.baseUrl}`);
        console.log(`Total Endpoints: ${stats.total}`);
        console.log(`Passed: ${stats.passed} (${stats.successRate.toFixed(1)}%)`);
        console.log(`Failed: ${stats.failed}`);
        console.log(`Total Errors: ${stats.errors}`);
        console.log(`Total Warnings: ${stats.warnings}`);
        console.log(`Average Errors per Endpoint: ${stats.averageErrors.toFixed(2)}`);
        console.log(`Average Warnings per Endpoint: ${stats.averageWarnings.toFixed(2)}`);

        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS');
            console.log('-'.repeat(30));
            report.recommendations.forEach(rec => console.log(`• ${rec}`));
        }
    }
}

export default BaseAPIValidator;
