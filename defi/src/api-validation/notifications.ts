import fetch from 'node-fetch';
import { ValidationResult } from './validator';

export interface DiscordNotificationOptions {
    webhookUrl: string;
    username?: string;
    avatarUrl?: string;
    color?: number;
    includeWarnings?: boolean;
    maxErrorsToShow?: number;
}

export interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    timestamp: string;
    footer?: {
        text: string;
    };
}

export class DiscordNotifier {
    private options: DiscordNotificationOptions;

    constructor(options: DiscordNotificationOptions) {
        this.options = {
            username: 'API Validation Bot',
            avatarUrl: 'https://defillama.com/favicon.ico',
            color: 0x00ff00, // Green for success
            includeWarnings: true,
            maxErrorsToShow: 10,
            ...options
        };
    }

    /**
     * Send validation results to Discord
     */
    async sendValidationResults(results: ValidationResult[], baseUrl: string): Promise<void> {
        if (!this.options.webhookUrl) {
            console.warn('Discord webhook URL not configured, skipping notifications');
            return;
        }

        const hasFailures = results.some(result => !result.isValid);
        const hasWarnings = results.some(result => result.warnings.length > 0);

        if (!hasFailures && !hasWarnings) {
            // Only send success notification if there are no failures or warnings
            await this.sendSuccessNotification(results, baseUrl);
            return;
        }

        if (hasFailures) {
            await this.sendFailureNotification(results, baseUrl);
        }

        if (hasWarnings && this.options.includeWarnings) {
            await this.sendWarningNotification(results, baseUrl);
        }
    }

    /**
     * Send success notification
     */
    private async sendSuccessNotification(results: ValidationResult[], baseUrl: string): Promise<void> {
        const embed: DiscordEmbed = {
            title: '✅ API Validation Successful',
            description: `All ${results.length} endpoints passed validation successfully!`,
            color: 0x00ff00, // Green
            fields: [
                {
                    name: 'Base URL',
                    value: baseUrl,
                    inline: false
                },
                {
                    name: 'Endpoints Validated',
                    value: results.length.toString(),
                    inline: true
                },
                {
                    name: 'Timestamp',
                    value: new Date().toISOString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        await this.sendDiscordMessage(embed);
    }

    /**
     * Send failure notification
     */
    private async sendFailureNotification(results: ValidationResult[], baseUrl: string): Promise<void> {
        const failedResults = results.filter(result => !result.isValid);
        const errorCount = failedResults.reduce((sum, result) => sum + result.errors.length, 0);

        const embed: DiscordEmbed = {
            title: '❌ API Validation Failed',
            description: `${failedResults.length} endpoints failed validation with ${errorCount} total errors.`,
            color: 0xff0000, // Red
            fields: [
                {
                    name: 'Base URL',
                    value: baseUrl,
                    inline: false
                },
                {
                    name: 'Failed Endpoints',
                    value: failedResults.length.toString(),
                    inline: true
                },
                {
                    name: 'Total Errors',
                    value: errorCount.toString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        // Add error details (limited to prevent Discord embed size limits)
        const errorFields = this.formatErrorFields(failedResults);
        embed.fields.push(...errorFields);

        await this.sendDiscordMessage(embed);
    }

    /**
     * Send warning notification
     */
    private async sendWarningNotification(results: ValidationResult[], baseUrl: string): Promise<void> {
        const warningResults = results.filter(result => result.warnings.length > 0);
        const warningCount = warningResults.reduce((sum, result) => sum + result.warnings.length, 0);

        const embed: DiscordEmbed = {
            title: '⚠️ API Validation Warnings',
            description: `${warningResults.length} endpoints have warnings (${warningCount} total warnings).`,
            color: 0xffa500, // Orange
            fields: [
                {
                    name: 'Base URL',
                    value: baseUrl,
                    inline: false
                },
                {
                    name: 'Endpoints with Warnings',
                    value: warningResults.length.toString(),
                    inline: true
                },
                {
                    name: 'Total Warnings',
                    value: warningCount.toString(),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        // Add warning details
        const warningFields = this.formatWarningFields(warningResults);
        embed.fields.push(...warningFields);

        await this.sendDiscordMessage(embed);
    }

    /**
     * Format error fields for Discord embed
     */
    private formatErrorFields(failedResults: ValidationResult[]): Array<{ name: string; value: string; inline: boolean }> {
        const fields: Array<{ name: string; value: string; inline: boolean }> = [];

        for (const result of failedResults.slice(0, this.options.maxErrorsToShow!)) {
            const errorSummary = result.errors.slice(0, 3).join('\n');
            const remainingErrors = result.errors.length > 3 ? `... and ${result.errors.length - 3} more` : '';

            fields.push({
                name: `❌ ${result.endpoint}`,
                value: `${errorSummary}${remainingErrors}`,
                inline: false
            });
        }

        if (failedResults.length > this.options.maxErrorsToShow!) {
            fields.push({
                name: 'Additional Failures',
                value: `... and ${failedResults.length - this.options.maxErrorsToShow!} more endpoints failed validation.`,
                inline: false
            });
        }

        return fields;
    }

    /**
     * Format warning fields for Discord embed
     */
    private formatWarningFields(warningResults: ValidationResult[]): Array<{ name: string; value: string; inline: boolean }> {
        const fields: Array<{ name: string; value: string; inline: boolean }> = [];

        for (const result of warningResults.slice(0, this.options.maxErrorsToShow!)) {
            const warningSummary = result.warnings.slice(0, 2).join('\n');
            const remainingWarnings = result.warnings.length > 2 ? `... and ${result.warnings.length - 2} more` : '';

            fields.push({
                name: `⚠️ ${result.endpoint}`,
                value: `${warningSummary}${remainingWarnings}`,
                inline: false
            });
        }

        if (warningResults.length > this.options.maxErrorsToShow!) {
            fields.push({
                name: 'Additional Warnings',
                value: `... and ${warningResults.length - this.options.maxErrorsToShow!} more endpoints have warnings.`,
                inline: false
            });
        }

        return fields;
    }

    /**
     * Send message to Discord webhook
     */
    private async sendDiscordMessage(embed: DiscordEmbed): Promise<void> {
        try {
            const payload = {
                username: this.options.username,
                avatar_url: this.options.avatarUrl,
                embeds: [embed]
            };

            const response = await fetch(this.options.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Discord API responded with status: ${response.status}`);
            }

            console.log('Discord notification sent successfully');
        } catch (error) {
            console.error('Failed to send Discord notification:', error);
        }
    }

    /**
     * Send a custom message to Discord
     */
    async sendCustomMessage(title: string, description: string, color: number = 0x0099ff): Promise<void> {
        const embed: DiscordEmbed = {
            title,
            description,
            color,
            fields: [],
            timestamp: new Date().toISOString()
        };

        await this.sendDiscordMessage(embed);
    }
}

export default DiscordNotifier;
