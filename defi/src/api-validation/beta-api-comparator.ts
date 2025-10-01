import fetch from 'node-fetch';
import { APIValidator, ValidationResult, ValidationOptions } from './validator';
import { DiscordNotifier } from './notifications';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface BetaAPIComparatorOptions {
    baseUrl: string;
    betaUrl: string;
    discordWebhookUrl?: string;
    outputDir?: string;
    validationOptions?: ValidationOptions;
    endpoints?: string[];
    timeout?: number;
    retries?: number;
    numericalTolerance?: number;
    maxArrayItemsToCompare?: number;
}

export interface ComparisonResult {
    endpoint: string;
    baseData: any;
    betaData: any;
    schemaValidation: ValidationResult;
    numericalComparison: {
        isValid: boolean;
        differences: Array<{
            path: string;
            baseValue: number;
            betaValue: number;
            difference: number;
            percentageDiff: number;
            withinTolerance: boolean;
        }>;
        arrayComparison: {
            isValid: boolean;
            differences: Array<{
                path: string;
                baseLength: number;
                betaLength: number;
                sampleDifferences: Array<{
                    index: number;
                    baseValue: any;
                    betaValue: any;
                    difference?: number;
                }>;
            }>;
        };
    };
    overallValid: boolean;
    timestamp: number;
}

export interface ComparisonReport {
    summary: {
        totalEndpoints: number;
        passedEndpoints: number;
        failedEndpoints: number;
        totalSchemaErrors: number;
        totalNumericalDifferences: number;
        totalArrayDifferences: number;
        timestamp: number;
        baseUrl: string;
        betaUrl: string;
    };
    results: ComparisonResult[];
    recommendations: string[];
}

export class BetaAPIComparator {
    private validator: APIValidator;
    private notifier?: DiscordNotifier;
    private options: BetaAPIComparatorOptions;
    private defaultEndpoints = [
        '/protocols',
        '/chains',
        '/cexs',
        '/treasuries',
        '/entities'
    ];

    constructor(options: BetaAPIComparatorOptions) {
        this.options = {
            timeout: 30000,
            retries: 3,
            numericalTolerance: 10, // 10% tolerance
            maxArrayItemsToCompare: 10,
            ...options
        };

        this.validator = new APIValidator({
            ...this.options.validationOptions,
            validateNumericalTolerance: true,
            tolerancePercentage: this.options.numericalTolerance
        });

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
     * Run comparison between base and beta APIs
     */
    async runComparison(): Promise<ComparisonReport> {
        console.log(`🚀 Starting API comparison`);
        console.log(`📊 Base API: ${this.options.baseUrl}`);
        console.log(`🧪 Beta API: ${this.options.betaUrl}`);
        console.log(`📋 Comparing ${this.options.endpoints?.length || this.defaultEndpoints.length} endpoints...`);

        const endpoints = this.options.endpoints || this.defaultEndpoints;
        const results: ComparisonResult[] = [];
        const startTime = Date.now();

        for (const endpoint of endpoints) {
            try {
                console.log(`\n🔍 Comparing: ${endpoint}`);

                // Fetch data from both APIs
                const [baseData, betaData] = await Promise.all([
                    this.fetchEndpoint(this.options.baseUrl, endpoint),
                    this.fetchEndpoint(this.options.betaUrl, endpoint)
                ]);

                // Validate beta API response against schema
                const schemaValidation = this.validator.validateEndpoint(endpoint, betaData, this.options.validationOptions);

                // Compare numerical values
                const numericalComparison = this.compareNumericalValues(baseData, betaData, endpoint);

                // Compare array structures
                const arrayComparison = this.compareArrayStructures(baseData, betaData, endpoint);

                const result: ComparisonResult = {
                    endpoint,
                    baseData,
                    betaData,
                    schemaValidation,
                    numericalComparison: {
                        isValid: numericalComparison.isValid,
                        differences: numericalComparison.differences,
                        arrayComparison
                    },
                    overallValid: schemaValidation.isValid && numericalComparison.isValid && arrayComparison.isValid,
                    timestamp: Date.now()
                };

                results.push(result);

                // Log results
                if (result.overallValid) {
                    console.log(`✅ ${endpoint}: PASSED`);
                } else {
                    console.log(`❌ ${endpoint}: FAILED`);
                    if (!schemaValidation.isValid) {
                        console.log(`   Schema errors: ${schemaValidation.errors.length}`);
                    }
                    if (!numericalComparison.isValid) {
                        console.log(`   Numerical differences: ${numericalComparison.differences.length}`);
                    }
                    if (!arrayComparison.isValid) {
                        console.log(`   Array differences: ${arrayComparison.differences.length}`);
                    }
                }
            } catch (error) {
                console.error(`💥 Error comparing ${endpoint}:`, error);
                // Create error result
                results.push({
                    endpoint,
                    baseData: null,
                    betaData: null,
                    schemaValidation: {
                        isValid: false,
                        errors: [`Comparison failed: ${error}`],
                        warnings: [],
                        schemaUsed: 'unknown',
                        endpoint,
                        timestamp: Date.now()
                    },
                    numericalComparison: {
                        isValid: false,
                        differences: [],
                        arrayComparison: {
                            isValid: false,
                            differences: []
                        }
                    },
                    overallValid: false,
                    timestamp: Date.now()
                });
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`\n⏱️  Comparison completed in ${duration}ms`);

        const report = this.generateReport(results);
        await this.saveReport(report);

        if (this.notifier) {
            await this.notifier.sendValidationResults(
                results.map(r => r.schemaValidation),
                this.options.betaUrl
            );
        }

        return report;
    }

    /**
     * Fetch data from a specific endpoint
     */
    private async fetchEndpoint(baseUrl: string, endpoint: string): Promise<any> {
        const url = `${baseUrl}${endpoint}`;

        for (let attempt = 1; attempt <= this.options.retries!; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'DeFiLlama-Beta-API-Comparator/1.0.0'
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
                    console.warn(`⏰ Timeout on attempt ${attempt} for ${url}, retrying...`);
                } else {
                    console.warn(`🔄 Attempt ${attempt} failed for ${url}: ${error.message}, retrying...`);
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }

        throw new Error(`Failed to fetch ${url} after ${this.options.retries} attempts`);
    }

    /**
     * Compare numerical values between base and beta APIs
     */
    private compareNumericalValues(baseData: any, betaData: any, endpoint: string): {
        isValid: boolean;
        differences: Array<{
            path: string;
            baseValue: number;
            betaValue: number;
            difference: number;
            percentageDiff: number;
            withinTolerance: boolean;
        }>;
    } {
        const differences: Array<{
            path: string;
            baseValue: number;
            betaValue: number;
            difference: number;
            percentageDiff: number;
            withinTolerance: boolean;
        }> = [];

        const tolerance = this.options.numericalTolerance! / 100;

        const compareValues = (base: any, beta: any, path: string) => {
            if (typeof base === 'number' && typeof beta === 'number' && !isNaN(base) && !isNaN(beta)) {
                const difference = Math.abs(base - beta);
                const percentageDiff = (difference / Math.abs(base)) * 100;
                const withinTolerance = percentageDiff <= this.options.numericalTolerance!;

                if (!withinTolerance) {
                    differences.push({
                        path,
                        baseValue: base,
                        betaValue: beta,
                        difference,
                        percentageDiff,
                        withinTolerance
                    });
                }
            }
        };

        const traverse = (base: any, beta: any, path = '') => {
            if (base && beta && typeof base === 'object' && typeof beta === 'object') {
                for (const [key, baseValue] of Object.entries(base)) {
                    const betaValue = beta[key];
                    const currentPath = path ? `${path}.${key}` : key;

                    compareValues(baseValue, betaValue, currentPath);

                    if (Array.isArray(baseValue) && Array.isArray(betaValue)) {
                        // Handle arrays separately
                        continue;
                    } else if (baseValue && betaValue && typeof baseValue === 'object' && typeof betaValue === 'object') {
                        traverse(baseValue, betaValue, currentPath);
                    }
                }
            }
        };

        traverse(baseData, betaData);

        return {
            isValid: differences.length === 0,
            differences
        };
    }

    /**
     * Compare array structures between base and beta APIs
     */
    private compareArrayStructures(baseData: any, betaData: any, endpoint: string): {
        isValid: boolean;
        differences: Array<{
            path: string;
            baseLength: number;
            betaLength: number;
            sampleDifferences: Array<{
                index: number;
                baseValue: any;
                betaValue: any;
                difference?: number;
            }>;
        }>;
    } {
        const differences: Array<{
            path: string;
            baseLength: number;
            betaLength: number;
            sampleDifferences: Array<{
                index: number;
                baseValue: any;
                betaValue: any;
                difference?: number;
            }>;
        }> = [];

        const compareArrays = (base: any[], beta: any[], path: string) => {
            const baseLength = base.length;
            const betaLength = beta.length;

            if (baseLength !== betaLength) {
                // Compare sample items
                const sampleDifferences: Array<{
                    index: number;
                    baseValue: any;
                    betaValue: any;
                    difference?: number;
                }> = [];

                // Compare first items
                const firstItemsToCompare = Math.min(this.options.maxArrayItemsToCompare!, Math.min(baseLength, betaLength));
                for (let i = 0; i < firstItemsToCompare; i++) {
                    if (typeof base[i] === 'number' && typeof beta[i] === 'number') {
                        const diff = Math.abs(base[i] - beta[i]);
                        const percentageDiff = (diff / Math.abs(base[i])) * 100;

                        if (percentageDiff > this.options.numericalTolerance!) {
                            sampleDifferences.push({
                                index: i,
                                baseValue: base[i],
                                betaValue: beta[i],
                                difference: diff
                            });
                        }
                    }
                }

                // Compare last items
                if (baseLength > 0 && betaLength > 0) {
                    const lastBase = base[baseLength - 1];
                    const lastBeta = beta[betaLength - 1];

                    if (typeof lastBase === 'number' && typeof lastBeta === 'number') {
                        const diff = Math.abs(lastBase - lastBeta);
                        const percentageDiff = (diff / Math.abs(lastBase)) * 100;

                        if (percentageDiff > this.options.numericalTolerance!) {
                            sampleDifferences.push({
                                index: baseLength - 1,
                                baseValue: lastBase,
                                betaValue: lastBeta,
                                difference: diff
                            });
                        }
                    }
                }

                // Compare random items
                const randomIndices = this.getRandomIndices(Math.min(baseLength, betaLength), 3);
                for (const index of randomIndices) {
                    if (typeof base[index] === 'number' && typeof beta[index] === 'number') {
                        const diff = Math.abs(base[index] - beta[index]);
                        const percentageDiff = (diff / Math.abs(base[index])) * 100;

                        if (percentageDiff > this.options.numericalTolerance!) {
                            sampleDifferences.push({
                                index,
                                baseValue: base[index],
                                betaValue: beta[index],
                                difference: diff
                            });
                        }
                    }
                }

                differences.push({
                    path,
                    baseLength,
                    betaLength,
                    sampleDifferences
                });
            }
        };

        const traverse = (base: any, beta: any, path = '') => {
            if (base && beta && typeof base === 'object' && typeof beta === 'object') {
                for (const [key, baseValue] of Object.entries(base)) {
                    const betaValue = beta[key];
                    const currentPath = path ? `${path}.${key}` : key;

                    if (Array.isArray(baseValue) && Array.isArray(betaValue)) {
                        compareArrays(baseValue, betaValue, currentPath);
                    } else if (baseValue && betaValue && typeof baseValue === 'object' && typeof betaValue === 'object') {
                        traverse(baseValue, betaValue, currentPath);
                    }
                }
            }
        };

        traverse(baseData, betaData);

        return {
            isValid: differences.length === 0,
            differences
        };
    }

    /**
     * Get random indices for sampling
     */
    private getRandomIndices(max: number, count: number): number[] {
        const indices: number[] = [];
        const available = Array.from({ length: max }, (_, i) => i);

        for (let i = 0; i < Math.min(count, max); i++) {
            const randomIndex = Math.floor(Math.random() * available.length);
            indices.push(available.splice(randomIndex, 1)[0]);
        }

        return indices.sort((a, b) => a - b);
    }

    /**
     * Generate comprehensive comparison report
     */
    private generateReport(results: ComparisonResult[]): ComparisonReport {
        const totalEndpoints = results.length;
        const passedEndpoints = results.filter(r => r.overallValid).length;
        const failedEndpoints = totalEndpoints - passedEndpoints;
        const totalSchemaErrors = results.reduce((sum, r) => sum + (r.schemaValidation.isValid ? 0 : r.schemaValidation.errors.length), 0);
        const totalNumericalDifferences = results.reduce((sum, r) => sum + r.numericalComparison.differences.length, 0);
        const totalArrayDifferences = results.reduce((sum, r) => sum + r.numericalComparison.arrayComparison.differences.length, 0);

        const recommendations: string[] = [];

        if (failedEndpoints > 0) {
            recommendations.push(`Fix ${failedEndpoints} failed endpoints to ensure beta API compatibility`);
        }

        if (totalSchemaErrors > 0) {
            recommendations.push(`Resolve ${totalSchemaErrors} schema validation errors in beta API`);
        }

        if (totalNumericalDifferences > 0) {
            recommendations.push(`Investigate ${totalNumericalDifferences} numerical differences exceeding ${this.options.numericalTolerance}% tolerance`);
        }

        if (totalArrayDifferences > 0) {
            recommendations.push(`Review ${totalArrayDifferences} array structure differences between base and beta APIs`);
        }

        if (failedEndpoints === 0) {
            recommendations.push('Beta API is fully compatible with base API. Consider expanding test coverage.');
        }

        return {
            summary: {
                totalEndpoints,
                passedEndpoints,
                failedEndpoints,
                totalSchemaErrors,
                totalNumericalDifferences,
                totalArrayDifferences,
                timestamp: Date.now(),
                baseUrl: this.options.baseUrl,
                betaUrl: this.options.betaUrl
            },
            results,
            recommendations
        };
    }

    /**
     * Save comparison report to file
     */
    private async saveReport(report: ComparisonReport): Promise<void> {
        if (!this.options.outputDir) return;

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `beta-comparison-report-${timestamp}.json`;
            const filepath = join(this.options.outputDir, filename);

            writeFileSync(filepath, JSON.stringify(report, null, 2));
            console.log(`📄 Report saved to: ${filepath}`);
        } catch (error) {
            console.error('Failed to save report:', error);
        }
    }

    /**
     * Print comparison summary to console
     */
    printSummary(report: ComparisonReport): void {
        const { summary } = report;

        console.log('\n📊 BETA API COMPARISON SUMMARY');
        console.log('='.repeat(60));
        console.log(`Base API: ${summary.baseUrl}`);
        console.log(`Beta API: ${summary.betaUrl}`);
        console.log(`Total Endpoints: ${summary.totalEndpoints}`);
        console.log(`Passed: ${summary.passedEndpoints} (${((summary.passedEndpoints / summary.totalEndpoints) * 100).toFixed(1)}%)`);
        console.log(`Failed: ${summary.failedEndpoints}`);
        console.log(`Schema Errors: ${summary.totalSchemaErrors}`);
        console.log(`Numerical Differences: ${summary.totalNumericalDifferences}`);
        console.log(`Array Differences: ${summary.totalArrayDifferences}`);
        console.log(`Numerical Tolerance: ±${this.options.numericalTolerance}%`);

        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS');
            console.log('-'.repeat(30));
            report.recommendations.forEach(rec => console.log(`• ${rec}`));
        }
    }
}

export default BetaAPIComparator;
