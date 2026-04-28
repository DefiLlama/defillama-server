/**
 * Backfill the totalsupply column on daily_rwa_data (and optionally backup_rwa_data).
 *
 * Approach: since stored mcap_chain = price * raw_supply / 10^decimals, dividing
 * the stored mcap by the historical price gives back the decimal-adjusted supply
 * with no archive-node calls. Per-token decimals + price come from the coins API.
 * The user has confirmed all token deployments of an RWA on a given chain share
 * the same price, so any token on that chain is a valid representative.
 *
 * Usage: ts-node defi/src/rwa/cli/backfillTotalSupply.ts [--dry-run] [--backup]
 */

import { coins } from "@defillama/sdk";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { Op, QueryTypes } from "sequelize";
import { prepareAtvlContext } from "../atvlRefill";
import { initPG, DAILY_RWA_DATA, BACKUP_RWA_DATA } from "../db";
import { getChainDisplayName, getChainIdFromDisplayName } from "../../utils/normalizeChain";

const DRY_RUN = process.argv.includes("--dry-run");
const INCLUDE_BACKUP = process.argv.includes("--backup");
const TIMESTAMP_CONCURRENCY = 4;
const ROW_BATCH_SIZE = 1000;
const PRICE_BATCH_SIZE = 200;

function parseJson(v: any): Record<string, any> {
  if (!v) return {};
  if (typeof v === "object" && !Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return {}; }
}

// Build (rwaId, chainSlug) -> representative token address ("chain:0x..") from CSV contracts.
function buildRepresentativeTokens(rwaTokens: { [rwaId: string]: string[] }): { [rwaId: string]: { [chainSlug: string]: string } } {
  const result: { [rwaId: string]: { [chainSlug: string]: string } } = {};
  for (const rwaId of Object.keys(rwaTokens)) {
    result[rwaId] = {};
    for (const pk of rwaTokens[rwaId] || []) {
      if (!pk || typeof pk !== "string" || !pk.includes(":")) continue;
      const chain = pk.substring(0, pk.indexOf(":"));
      const chainSlug = getChainIdFromDisplayName(getChainDisplayName(chain, true));
      if (!result[rwaId][chainSlug]) result[rwaId][chainSlug] = pk;
    }
  }
  return result;
}

async function fetchPricesBatched(tokens: string[], timestamp: number): Promise<{ [token: string]: { price: number } }> {
  const out: { [token: string]: { price: number } } = {};
  const unique = Array.from(new Set(tokens));
  for (let i = 0; i < unique.length; i += PRICE_BATCH_SIZE) {
    const chunk = unique.slice(i, i + PRICE_BATCH_SIZE);
    try {
      const res = await coins.getPrices(chunk, timestamp);
      Object.assign(out, res);
    } catch (e) {
      console.error(`[backfill] getPrices failed for ts=${timestamp} chunk size=${chunk.length}: ${(e as any)?.message || e}`);
    }
  }
  return out;
}

async function getDistinctTimestamps(): Promise<number[]> {
  const rows = await DAILY_RWA_DATA.sequelize!.query(
    `SELECT DISTINCT timestamp FROM "${DAILY_RWA_DATA.getTableName()}" ORDER BY timestamp ASC`,
    { type: QueryTypes.SELECT }
  ) as { timestamp: number }[];
  return rows.map((r) => r.timestamp);
}

async function fetchRowsAtTimestamp(timestamp: number): Promise<Array<{ id: string; timestamp: number; mcap: any; totalsupply: any }>> {
  const rows: any[] = [];
  let offset = 0;
  while (true) {
    const batch = await DAILY_RWA_DATA.findAll({
      attributes: ["id", "timestamp", "mcap", "totalsupply"],
      where: { timestamp },
      order: [["id", "ASC"]],
      limit: ROW_BATCH_SIZE,
      offset,
      raw: true,
    }) as any[];
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < ROW_BATCH_SIZE) break;
    offset += ROW_BATCH_SIZE;
  }
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    mcap: parseJson(r.mcap),
    totalsupply: parseJson(r.totalsupply),
  }));
}

async function processTimestamp(
  timestamp: number,
  repByRwa: { [rwaId: string]: { [chainSlug: string]: string } },
  stats: { rowsScanned: number; rowsUpdated: number; chainsSkipped: number }
) {
  const rows = await fetchRowsAtTimestamp(timestamp);
  if (rows.length === 0) return;

  // Skip rows whose totalsupply is already populated for every chain present in mcap.
  const rowsNeedingWork = rows.filter((row) => {
    const mcapChains = Object.keys(row.mcap || {});
    if (mcapChains.length === 0) return false;
    return mcapChains.some((c) => row.totalsupply?.[c] == null);
  });
  if (rowsNeedingWork.length === 0) {
    stats.rowsScanned += rows.length;
    return;
  }

  // Collect every representative token we need a price for at this timestamp.
  const tokens: string[] = [];
  for (const row of rowsNeedingWork) {
    const reps = repByRwa[row.id];
    if (!reps) continue;
    for (const chain of Object.keys(row.mcap)) {
      if (reps[chain]) tokens.push(reps[chain]);
    }
  }
  const prices = await fetchPricesBatched(tokens, timestamp);

  const updates: Array<{ id: string; timestamp: number; totalsupply: string }> = [];
  for (const row of rowsNeedingWork) {
    const reps = repByRwa[row.id];
    if (!reps) continue;

    const supplyByChain: { [chain: string]: string } = { ...row.totalsupply };
    let mutated = false;
    for (const chain of Object.keys(row.mcap)) {
      if (supplyByChain[chain] != null) continue; // already set, leave alone
      const repToken = reps[chain];
      const price = repToken ? prices[repToken]?.price : undefined;
      const mcap = Number(row.mcap[chain]) || 0;
      if (!price || !mcap) {
        stats.chainsSkipped++;
        continue;
      }
      supplyByChain[chain] = String(mcap / price);
      mutated = true;
    }
    if (mutated) updates.push({ id: row.id, timestamp: row.timestamp, totalsupply: JSON.stringify(supplyByChain) });
  }

  stats.rowsScanned += rows.length;

  if (updates.length === 0) return;
  if (DRY_RUN) {
    stats.rowsUpdated += updates.length;
    return;
  }

  // Bulk update via ON CONFLICT. Sequelize bulkCreate requires PK fields; since (timestamp,id) is PK, we can rely on updateOnDuplicate.
  await DAILY_RWA_DATA.bulkCreate(updates as any[], { updateOnDuplicate: ["totalsupply", "updated_at"] });
  if (INCLUDE_BACKUP) {
    await BACKUP_RWA_DATA.bulkCreate(updates as any[], { updateOnDuplicate: ["totalsupply", "updated_at"] });
  }
  stats.rowsUpdated += updates.length;
}

async function main() {
  console.log(`[backfill] DRY_RUN=${DRY_RUN} INCLUDE_BACKUP=${INCLUDE_BACKUP}`);
  await initPG();

  const t0 = Date.now();
  const context = await prepareAtvlContext();
  const repByRwa = buildRepresentativeTokens(context.rwaTokens);
  console.log(`[backfill] built representative-token map for ${Object.keys(repByRwa).length} RWAs in ${Date.now() - t0}ms`);

  const timestamps = await getDistinctTimestamps();
  console.log(`[backfill] ${timestamps.length} distinct timestamps to process`);

  const stats = { rowsScanned: 0, rowsUpdated: 0, chainsSkipped: 0 };
  let processed = 0;
  await runInPromisePool({
    items: timestamps,
    concurrency: TIMESTAMP_CONCURRENCY,
    processor: async (ts: number) => {
      await processTimestamp(ts, repByRwa, stats);
      processed++;
      if (processed % 25 === 0 || processed === timestamps.length) {
        console.log(`[backfill] ${processed}/${timestamps.length} timestamps — scanned=${stats.rowsScanned} updated=${stats.rowsUpdated} chainsSkipped=${stats.chainsSkipped}`);
      }
    },
  });

  console.log(`[backfill] done in ${((Date.now() - t0) / 1000).toFixed(1)}s — scanned=${stats.rowsScanned} updated=${stats.rowsUpdated} chainsSkipped=${stats.chainsSkipped}`);
}

main().catch((e) => {
  console.error("[backfill] fatal:", e);
  process.exit(1);
}).then(() => process.exit(0));
