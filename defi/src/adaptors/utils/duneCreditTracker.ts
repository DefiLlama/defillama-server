/**
 * Dune Credit Tracker
 * 
 * Tracks Dune API credit consumption per adapter module.
 * Accumulates query metadata during dimension runs and provides
 * summary reports for the dashboard endpoint.
 */

export interface DuneQueryRecord {
  queryId: string;
  adapter: string;
  chain?: string;
  creditsUsed: number;
  durationSeconds: number;
  rowsReturned: number;
  timestamp: number;
  isBatched: boolean;
  batchSize?: number;
  executionId?: string;
}

export interface AdapterCreditSummary {
  adapter: string;
  totalCredits: number;
  queryCount: number;
  avgCreditsPerQuery: number;
  avgDurationSeconds: number;
  totalRows: number;
  queries: DuneQueryRecord[];
}

export interface CreditReport {
  generatedAt: number;
  runStartedAt: number;
  totalCreditsUsed: number;
  totalQueryCount: number;
  avgCreditsPerQuery: number;
  topConsumers: AdapterCreditSummary[];
  recentQueries: DuneQueryRecord[];
  expensiveQueries: DuneQueryRecord[];
}

// In-memory store for the current run
const queryRecords: DuneQueryRecord[] = [];
let runStartedAt = Math.floor(Date.now() / 1000);

// Configurable thresholds
const EXPENSIVE_CREDIT_THRESHOLD = Number(process.env.DUNE_EXPENSIVE_CREDIT_THRESHOLD ?? 100);
const EXPENSIVE_DURATION_THRESHOLD = Number(process.env.DUNE_EXPENSIVE_DURATION_THRESHOLD ?? 30); // seconds
const MAX_CREDITS_PER_RUN = Number(process.env.DUNE_MAX_CREDITS_PER_RUN ?? Infinity);

let totalCreditsThisRun = 0;

/**
 * Record a completed Dune query execution
 */
export function recordDuneQuery(record: DuneQueryRecord): void {
  queryRecords.push(record);
  totalCreditsThisRun += record.creditsUsed;

  // Log expensive queries immediately
  if (record.creditsUsed > EXPENSIVE_CREDIT_THRESHOLD || record.durationSeconds > EXPENSIVE_DURATION_THRESHOLD) {
    console.warn(
      `[Dune][EXPENSIVE] adapter=${record.adapter} queryId=${record.queryId} ` +
      `credits=${record.creditsUsed} duration=${record.durationSeconds.toFixed(1)}s ` +
      `rows=${record.rowsReturned} chain=${record.chain ?? 'N/A'}`
    );
  }
}

/**
 * Check if the credit budget has been exceeded
 * @throws Error if budget exceeded
 */
export function checkCreditBudget(): void {
  if (totalCreditsThisRun >= MAX_CREDITS_PER_RUN) {
    throw new Error(
      `[Dune] Credit budget exceeded: ${totalCreditsThisRun.toFixed(2)}/${MAX_CREDITS_PER_RUN} credits used this run`
    );
  }
}

/**
 * Get whether budget enforcement is active
 */
export function isBudgetEnforcementActive(): boolean {
  return isFinite(MAX_CREDITS_PER_RUN);
}

/**
 * Get credits used so far in this run
 */
export function getCreditsUsedThisRun(): number {
  return totalCreditsThisRun;
}

/**
 * Generate a full credit usage report from in-memory data
 */
export function generateCreditReport(): CreditReport {
  // Group queries by adapter
  const adapterMap = new Map<string, DuneQueryRecord[]>();
  for (const record of queryRecords) {
    const key = record.adapter;
    if (!adapterMap.has(key)) adapterMap.set(key, []);
    adapterMap.get(key)!.push(record);
  }

  // Build per-adapter summaries
  const topConsumers: AdapterCreditSummary[] = [];
  for (const [adapter, queries] of adapterMap.entries()) {
    const totalCredits = queries.reduce((sum, q) => sum + q.creditsUsed, 0);
    const totalDuration = queries.reduce((sum, q) => sum + q.durationSeconds, 0);
    const totalRows = queries.reduce((sum, q) => sum + q.rowsReturned, 0);

    topConsumers.push({
      adapter,
      totalCredits,
      queryCount: queries.length,
      avgCreditsPerQuery: queries.length > 0 ? totalCredits / queries.length : 0,
      avgDurationSeconds: queries.length > 0 ? totalDuration / queries.length : 0,
      totalRows,
      queries,
    });
  }

  // Sort by total credits descending
  topConsumers.sort((a, b) => b.totalCredits - a.totalCredits);

  // Get expensive queries
  const expensiveQueries = queryRecords
    .filter(q => q.creditsUsed > EXPENSIVE_CREDIT_THRESHOLD || q.durationSeconds > EXPENSIVE_DURATION_THRESHOLD)
    .sort((a, b) => b.creditsUsed - a.creditsUsed);

  // Recent queries (last 50)
  const recentQueries = queryRecords.slice(-50).reverse();

  const totalCreditsUsed = queryRecords.reduce((sum, q) => sum + q.creditsUsed, 0);

  return {
    generatedAt: Math.floor(Date.now() / 1000),
    runStartedAt,
    totalCreditsUsed,
    totalQueryCount: queryRecords.length,
    avgCreditsPerQuery: queryRecords.length > 0 ? totalCreditsUsed / queryRecords.length : 0,
    topConsumers: topConsumers.slice(0, 50), // top 50 consumers without individual queries
    recentQueries,
    expensiveQueries: expensiveQueries.slice(0, 30),
  };
}

/**
 * Generate a compact summary for logging/console output
 */
export function printCreditSummary(): void {
  const report = generateCreditReport();

  console.log('\n========== Dune Credit Usage Summary ==========');
  console.log(`Total credits used: ${report.totalCreditsUsed.toFixed(2)}`);
  console.log(`Total queries: ${report.totalQueryCount}`);
  console.log(`Avg credits/query: ${report.avgCreditsPerQuery.toFixed(2)}`);

  if (isBudgetEnforcementActive()) {
    const pct = (report.totalCreditsUsed / MAX_CREDITS_PER_RUN * 100).toFixed(1);
    console.log(`Budget: ${report.totalCreditsUsed.toFixed(2)} / ${MAX_CREDITS_PER_RUN} (${pct}%)`);
  }

  if (report.topConsumers.length > 0) {
    console.log('\nTop 10 consumers by credits:');
    console.table(
      report.topConsumers.slice(0, 10).map(c => ({
        adapter: c.adapter,
        credits: c.totalCredits.toFixed(2),
        queries: c.queryCount,
        'avg credits': c.avgCreditsPerQuery.toFixed(2),
        'avg duration(s)': c.avgDurationSeconds.toFixed(1),
      }))
    );
  }

  if (report.expensiveQueries.length > 0) {
    console.log(`\nExpensive queries (>${EXPENSIVE_CREDIT_THRESHOLD} credits or >${EXPENSIVE_DURATION_THRESHOLD}s):`);
    console.table(
      report.expensiveQueries.slice(0, 10).map(q => ({
        adapter: q.adapter,
        queryId: q.queryId,
        credits: q.creditsUsed.toFixed(2),
        'duration(s)': q.durationSeconds.toFixed(1),
        rows: q.rowsReturned,
        chain: q.chain ?? 'N/A',
      }))
    );
  }

  console.log('=================================================\n');
}

/**
 * Reset the tracker (call between runs)
 */
export function resetCreditTracker(): void {
  queryRecords.length = 0;
  totalCreditsThisRun = 0;
  runStartedAt = Math.floor(Date.now() / 1000);
}

/**
 * Get raw query records (for external processing)
 */
export function getQueryRecords(): ReadonlyArray<DuneQueryRecord> {
  return queryRecords;
}
