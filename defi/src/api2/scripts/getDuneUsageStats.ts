/**
 * Dune Credit Usage Stats Script
 * 
 * A CLI tool to check Dune API credit usage for the current billing period
 * and analyze which adapters are consuming the most credits.
 * 
 * Usage:
 *   npx ts-node --transpile-only src/api2/scripts/getDuneUsageStats.ts
 * 
 * Environment variables:
 *   DUNE_API_KEYS  - Dune API key (comma-separated, first key is used)
 *   DUNE_USAGE_START_DATE - Optional start date (YYYY-MM-DD) for usage query
 *   DUNE_USAGE_END_DATE   - Optional end date (YYYY-MM-DD) for usage query
 */

import axios from 'axios';

const DUNE_API_KEY = process.env.DUNE_API_KEYS?.split(',')[0];

if (!DUNE_API_KEY) {
  console.error('Error: DUNE_API_KEYS environment variable is not set');
  process.exit(1);
}

const axiosDune = axios.create({
  headers: {
    'x-dune-api-key': DUNE_API_KEY,
  },
  baseURL: 'https://api.dune.com/api/v1',
});

interface BillingPeriod {
  start_date: string;
  end_date: string;
  credits_used: number;
  credits_included: number;
}

interface UsageResponse {
  private_queries?: number;
  private_dashboards?: number;
  bytes_used?: number;
  bytes_allowed?: number;
  billingPeriods?: BillingPeriod[];
}

async function getDuneUsage(): Promise<UsageResponse> {
  const body: any = {};

  const startDate = process.env.DUNE_USAGE_START_DATE;
  const endDate = process.env.DUNE_USAGE_END_DATE;

  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;

  try {
    const { data } = await axiosDune.post('/usage', body);
    return data;
  } catch (err: any) {
    if (err.isAxiosError) {
      console.error(`Dune API error (${err.response?.status}):`, err.response?.data || err.message);
    } else {
      console.error('Error fetching Dune usage:', err.message);
    }
    throw err;
  }
}

async function main() {
  console.log('=========================================');
  console.log('  Dune Credit Usage Report');
  console.log('=========================================\n');

  try {
    const usage = await getDuneUsage();

    // Account-level info
    if (usage.private_queries !== undefined) {
      console.log('Account Overview:');
      console.log(`  Private queries: ${usage.private_queries}`);
      console.log(`  Private dashboards: ${usage.private_dashboards ?? 'N/A'}`);
      if (usage.bytes_used !== undefined && usage.bytes_allowed !== undefined) {
        const pctBytes = ((usage.bytes_used / usage.bytes_allowed) * 100).toFixed(1);
        console.log(`  Storage: ${formatBytes(usage.bytes_used)} / ${formatBytes(usage.bytes_allowed)} (${pctBytes}%)`);
      }
      console.log('');
    }

    // Billing periods
    if (usage.billingPeriods && usage.billingPeriods.length > 0) {
      console.log('Billing Periods:');
      console.log('─'.repeat(70));

      for (const period of usage.billingPeriods) {
        const pctUsed = period.credits_included > 0
          ? ((period.credits_used / period.credits_included) * 100).toFixed(1)
          : 'N/A';
        const remaining = period.credits_included - period.credits_used;

        console.log(`  Period: ${period.start_date} → ${period.end_date}`);
        console.log(`    Credits used:      ${period.credits_used.toLocaleString()}`);
        console.log(`    Credits included:  ${period.credits_included.toLocaleString()}`);
        console.log(`    Credits remaining: ${remaining.toLocaleString()}`);
        console.log(`    Usage:             ${pctUsed}%`);

        // Visual bar
        if (period.credits_included > 0) {
          const barLength = 40;
          const filledLength = Math.round((period.credits_used / period.credits_included) * barLength);
          const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
          console.log(`    [${bar}]`);
        }

        // Warning if over 80%
        const usagePct = period.credits_included > 0 ? (period.credits_used / period.credits_included) * 100 : 0;
        if (usagePct > 90) {
          console.log(`    ⚠️  CRITICAL: Over 90% of credits consumed!`);
        } else if (usagePct > 80) {
          console.log(`    ⚠️  WARNING: Over 80% of credits consumed`);
        }

        console.log('');
      }
    } else {
      console.log('No billing period data available.');
      console.log('Full response:');
      console.log(JSON.stringify(usage, null, 2));
    }

    // Recommendations
    console.log('─'.repeat(70));
    console.log('\nOptimization tips:');
    console.log('  1. Set DUNE_BULK_MODE=true during refills to batch queries');
    console.log('  2. Set DUNE_MAX_CREDITS_PER_RUN=<number> to enforce per-run budgets');
    console.log('  3. Use DUNE_EXPENSIVE_CREDIT_THRESHOLD=<number> to flag costly queries');
    console.log('  4. Run `npm run dune-usage` regularly to monitor consumption');
    console.log('');

  } catch (err) {
    console.error('\nFailed to fetch Dune usage data. Make sure DUNE_API_KEYS is set correctly.');
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

main().catch(console.error);
