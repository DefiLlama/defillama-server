/**
 * Parallelised RWA backfill + cleanup script.
 *
 * Same four phases as refillClean.ts but with ID-level and price-fetch
 * parallelism so the total wall-clock time is dominated by the slowest
 * single ID rather than the sum of all IDs.
 *
 * Usage: ts-node defi/src/rwa/cli/refillParallel.ts
 */

import fs from "fs";
import path from "path";
import https from "https";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { prepareAtvlContext, runAtvlForTimestamp } from "../atvlRefill";
import { getTimestampAtStartOfDay } from "../../utils/date";
import { initPG, fetchMetadataPG, DAILY_RWA_DATA } from "../db";
import { getChainIdFromDisplayName } from "../../utils/normalizeChain";
import { Op, QueryTypes } from "sequelize";

// ── Configuration ────────────────────────────────────────────────────
const DRY_RUN = false;
const START_DATE = "2025-09-01";
const END_DATE = "2026-04-14";
const BACKFILL_CONCURRENCY = 5;
const ID_CONCURRENCY = 10;
const PRICE_FETCH_CONCURRENCY = 8;
// Private Equity & Venture asset group IDs
const IDS = [ "2999",
];

// Early-stop: if an ID has 0 data for this many consecutive days (going backwards), skip it
const ZERO_STREAK_CUTOFF = 30;
const CHUNK_SIZE_DAYS = 30;

// Spike detection thresholds
const SPIKE_RATIO_LOW = 0.1;
const SPIKE_RATIO_HIGH = 1.5;
const RECOVERY_RATIO_LOW = 0.5;
const RECOVERY_RATIO_HIGH = 5;
const MAX_SPIKE_RUN = 5;

// Price-failure dip threshold
const DIP_RATIO = 0.7;

// ── Helpers ──────────────────────────────────────────────────────────
function parseJson(v: any): Record<string, number> {
  if (!v) return {};
  if (typeof v === "object" && !Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return {}; }
}

function sumObj(obj: Record<string, number>): number {
  return Object.values(obj).reduce((a, v) => a + (Number(v) || 0), 0);
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk: string) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)); }
      });
    }).on("error", reject);
  });
}

interface PricePoint { timestamp: number; price: number }
interface PriceChart { prices: PricePoint[]; decimals?: number; symbol?: string }

async function fetchPriceChart(
  coinKey: string, startTs: number, span: number,
): Promise<PriceChart | null> {
  const url = `https://coins.llama.fi/chart/${encodeURIComponent(coinKey)}?start=${startTs}&span=${span}&period=1d&searchWidth=5d`;
  try {
    const resp = await fetchJson(url);
    const entry = resp?.coins?.[coinKey];
    if (!entry?.prices?.length) return null;
    return { prices: entry.prices, decimals: entry.decimals, symbol: entry.symbol };
  } catch (e) {
    console.error(`  Failed to fetch chart for ${coinKey}: ${(e as any)?.message}`);
    return null;
  }
}

// ── Phase 1: Backfill ────────────────────────────────────────────────
function convertAtvlResult(
  timestamp: number,
  data: { [id: string]: any },
  ids: string[],
): any[] {
  const rows: any[] = [];
  for (const id of ids) {
    if (!data[id]) continue;
    const { onChainMcap, activeMcap } = data[id];

    const mcap: Record<string, number> = {};
    let aggregatemcap = 0;
    for (const [chain, val] of Object.entries(onChainMcap ?? {})) {
      const slug = getChainIdFromDisplayName(chain);
      mcap[slug] = Number(val) || 0;
      aggregatemcap += mcap[slug];
    }

    const activemcap: Record<string, number> = {};
    let aggregatedactivemcap = 0;
    for (const [chain, val] of Object.entries(activeMcap ?? {})) {
      const slug = getChainIdFromDisplayName(chain);
      activemcap[slug] = Number(val) || 0;
      aggregatedactivemcap += activemcap[slug];
    }

    rows.push({
      timestamp,
      id,
      mcap: JSON.stringify(mcap),
      activemcap: JSON.stringify(activemcap),
      aggregatemcap,
      aggregatedactivemcap,
    });
  }
  return rows;
}

function hasNonZeroData(result: { [id: string]: any }, id: string): boolean {
  if (!result[id]) return false;
  const { onChainMcap, activeMcap } = result[id];
  const mcapTotal = (Object.values(onChainMcap ?? {}) as any[]).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
  const activeTotal = (Object.values(activeMcap ?? {}) as any[]).reduce((a: number, v: any) => a + (Number(v) || 0), 0);
  return mcapTotal > 0 || activeTotal > 0;
}

async function runBackfill(
  startDate: string,
  endDate: string,
  ids: string[],
  collectResults: boolean,
): Promise<any[]> {
  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);
  process.env.RWA_REFILL_INCLUSIVE = "true";
  process.env.RWA_FORCE_ACTIVE_MCAP = "true";

  // Build all timestamps newest-to-oldest
  const allTimestamps: number[] = [];
  let ts = end;
  while (ts > start) {
    allTimestamps.push(getTimestampAtStartOfDay(ts));
    ts -= 86400;
  }

  // Split into chunks of CHUNK_SIZE_DAYS
  const chunks: number[][] = [];
  for (let i = 0; i < allTimestamps.length; i += CHUNK_SIZE_DAYS) {
    chunks.push(allTimestamps.slice(i, i + CHUNK_SIZE_DAYS));
  }

  console.log(`\n── Phase 1: Backfill (${allTimestamps.length} days in ${chunks.length} chunks, concurrency=${BACKFILL_CONCURRENCY}, dryRun=${DRY_RUN}) ──`);

  let activeIds = [...ids];
  const zeroStreak: Record<string, number> = {};
  for (const id of ids) zeroStreak[id] = 0;
  const prunedIds = new Set<string>();

  const totalErrors: number[] = [];
  const collected: any[] = [];

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    if (activeIds.length === 0) {
      console.log(`  All IDs pruned — stopping early at chunk ${chunkIdx + 1}/${chunks.length}`);
      break;
    }

    const firstDate = new Date(chunk[chunk.length - 1] * 1000).toISOString().slice(0, 10);
    const lastDate = new Date(chunk[0] * 1000).toISOString().slice(0, 10);
    console.log(`  Chunk ${chunkIdx + 1}/${chunks.length}: ${firstDate} to ${lastDate} (${activeIds.length} IDs)`);

    const context = await prepareAtvlContext(activeIds);

    await runInPromisePool({
      items: chunk,
      concurrency: BACKFILL_CONCURRENCY,
      processor: async (timestamp: number) => {
        try {
          const result = await runAtvlForTimestamp(timestamp, context, { skipCircuitBreaker: true });
          console.log(`    Backfilled ${new Date(timestamp * 1000).toISOString().slice(0, 10)}`);

          // Track zero streaks per ID
          for (const id of activeIds) {
            if (hasNonZeroData(result, id)) {
              zeroStreak[id] = 0;
            } else {
              zeroStreak[id]++;
            }
          }

          if (collectResults && result) {
            collected.push(...convertAtvlResult(timestamp, result, activeIds));
          }
        } catch (e) {
          console.error(`    Error at ${timestamp}: ${e}`);
          totalErrors.push(timestamp);
        }
      },
    });

    // Prune IDs that hit the zero-streak cutoff
    const newlyPruned: string[] = [];
    for (const id of activeIds) {
      if (zeroStreak[id] >= ZERO_STREAK_CUTOFF && !prunedIds.has(id)) {
        prunedIds.add(id);
        newlyPruned.push(id);
      }
    }
    if (newlyPruned.length > 0) {
      console.log(`  Pruned ${newlyPruned.length} IDs with ${ZERO_STREAK_CUTOFF}+ consecutive zero days: ${newlyPruned.join(", ")}`);
      activeIds = activeIds.filter((id) => !prunedIds.has(id));
    }
  }

  console.log(`  Backfill done. Errors: ${totalErrors.length}/${allTimestamps.length}, pruned: ${prunedIds.size}/${ids.length} IDs`);
  return collected;
}

// ── Phase 2: Spike detection ─────────────────────────────────────────
function detectSpikeTimestamps(
  points: { timestamp: number; mcap: number }[],
): Set<number> {
  const toRemove = new Set<number>();
  if (points.length < 3) return toRemove;

  let lastGoodIdx = 0;
  let i = 1;

  while (i < points.length) {
    const lastGoodVal = points[lastGoodIdx].mcap;
    const currVal = points[i].mcap;

    if (!Number.isFinite(lastGoodVal) || !Number.isFinite(currVal) || lastGoodVal < 1) {
      lastGoodIdx = i;
      i++;
      continue;
    }

    const ratio = currVal / lastGoodVal;
    if (ratio >= SPIKE_RATIO_LOW && ratio <= SPIKE_RATIO_HIGH) {
      lastGoodIdx = i;
      i++;
      continue;
    }

    let nextGoodIdx = -1;
    for (let j = i + 1; j < Math.min(i + MAX_SPIKE_RUN + 1, points.length); j++) {
      const jVal = points[j].mcap;
      if (!Number.isFinite(jVal)) break;
      const jRatio = jVal / lastGoodVal;
      if (jRatio >= RECOVERY_RATIO_LOW && jRatio <= RECOVERY_RATIO_HIGH) {
        nextGoodIdx = j;
        break;
      }
    }

    if (nextGoodIdx === -1) {
      lastGoodIdx = i;
      i++;
      continue;
    }

    for (let k = i; k < nextGoodIdx; k++) {
      toRemove.add(points[k].timestamp);
    }
    lastGoodIdx = nextGoodIdx;
    i = nextGoodIdx + 1;
  }

  return toRemove;
}

// ── Phase 3: Price-failure fix ───────────────────────────────────────
// Fetch all price charts for one ID's contracts in parallel
async function fetchAllPriceCharts(
  contracts: Record<string, string[]>,
  firstTs: number,
  spanDays: number,
): Promise<Record<string, Record<number, { price: number; decimals: number }>>> {
  const coinKeys: { coinKey: string; chainSlug: string }[] = [];
  for (const [chainLabel, addresses] of Object.entries(contracts)) {
    const chainSlug = getChainIdFromDisplayName(chainLabel);
    for (const addr of addresses) {
      coinKeys.push({ coinKey: `${chainSlug}:${addr}`, chainSlug });
    }
  }
  if (coinKeys.length === 0) return {};

  const priceByChainTs: Record<string, Record<number, { price: number; decimals: number }>> = {};

  // Build fetch jobs: each (coinKey, batch) pair is an independent fetch
  const fetchJobs: { coinKey: string; chainSlug: string; start: number; span: number }[] = [];
  for (const { coinKey, chainSlug } of coinKeys) {
    let remaining = spanDays;
    let start = firstTs;
    while (remaining > 0) {
      const batchSpan = Math.min(remaining, 500);
      fetchJobs.push({ coinKey, chainSlug, start, span: batchSpan });
      remaining -= batchSpan;
      start += batchSpan * 86400;
    }
  }

  // Parallel price fetches
  await runInPromisePool({
    items: fetchJobs,
    concurrency: PRICE_FETCH_CONCURRENCY,
    processor: async ({ coinKey, chainSlug, start, span }: { coinKey: string; chainSlug: string; start: number; span: number }) => {
      const chart = await fetchPriceChart(coinKey, start, span);
      if (!chart) return;
      if (!priceByChainTs[chainSlug]) priceByChainTs[chainSlug] = {};
      const decimals = chart.decimals ?? 18;
      for (const pp of chart.prices) {
        const dayTs = Math.floor(pp.timestamp / 86400) * 86400;
        priceByChainTs[chainSlug][dayTs] = { price: pp.price, decimals };
      }
    },
  });

  return priceByChainTs;
}

function applyPriceFixes(
  rows: any[],
  priceByChainTs: Record<string, Record<number, { price: number; decimals: number }>>,
): { fixedRows: any[]; fixCount: number } {
  if (Object.keys(priceByChainTs).length === 0) return { fixedRows: rows, fixCount: 0 };

  const forwardSupplyCache: Record<string, number> = {};
  let prevTotalMcap = 0;
  let fixCount = 0;

  const fixedRows = rows.map((row: any) => {
    const ts = Number(row.timestamp);
    const mcapObj = parseJson(row.mcap);
    const activemcapObj = parseJson(row.activemcap);
    const originalTotal = sumObj(mcapObj);

    let modified = false;
    const newMcap = { ...mcapObj };
    const newActivemcap = { ...activemcapObj };

    for (const chainSlug of Object.keys(priceByChainTs)) {
      const chainMcap = Number(mcapObj[chainSlug]) || 0;
      const priceEntry = priceByChainTs[chainSlug][ts]
        || priceByChainTs[chainSlug][ts - 86400]
        || priceByChainTs[chainSlug][ts + 86400];

      if (chainMcap > 100 && priceEntry && priceEntry.price > 0) {
        const implied = (chainMcap * Math.pow(10, priceEntry.decimals)) / priceEntry.price;
        if (Number.isFinite(implied) && implied > 0) {
          if (prevTotalMcap === 0 || originalTotal > prevTotalMcap * DIP_RATIO) {
            forwardSupplyCache[chainSlug] = implied;
          }
        }
      }

      const cachedSupply = forwardSupplyCache[chainSlug];
      if (!cachedSupply || !priceEntry || priceEntry.price <= 0) continue;

      const expectedMcap = (priceEntry.price * cachedSupply) / Math.pow(10, priceEntry.decimals);
      if (!Number.isFinite(expectedMcap) || expectedMcap < 100) continue;

      if (chainMcap < expectedMcap * DIP_RATIO) {
        newMcap[chainSlug] = Math.round(expectedMcap);
        const activeRatio = chainMcap > 0
          ? (Number(activemcapObj[chainSlug]) || 0) / chainMcap
          : 1;
        newActivemcap[chainSlug] = Math.round(expectedMcap * Math.min(activeRatio, 1));
        modified = true;
      }
    }

    prevTotalMcap = sumObj(newMcap);

    if (modified) {
      fixCount++;
      if (fixCount <= 5) {
        const date = new Date(ts * 1000).toISOString().slice(0, 10);
        console.log(`    FIX ${date}: ${fmt(originalTotal)} -> ${fmt(sumObj(newMcap))}`);
      }
      return {
        ...row,
        mcap: JSON.stringify(newMcap),
        activemcap: JSON.stringify(newActivemcap),
        aggregatemcap: sumObj(newMcap),
        aggregatedactivemcap: sumObj(newActivemcap),
        _modified: true,
      };
    }
    return row;
  });

  return { fixedRows, fixCount };
}

// ── Per-ID pipeline (phases 2+3 + DB writes) ────────────────────────
interface IdResult {
  id: string;
  ticker: string;
  raw: ChartSeries[];
  afterSpikes: ChartSeries[];
  afterPriceFix: ChartSeries[];
  spikeCount: number;
  priceFixCount: number;
}

interface ChartSeries { timestamp: number; mcap: number; activeMcap: number }

async function processOneId(
  id: string,
  meta: any,
  collectedRows: any[] | null,
): Promise<IdResult | null> {
  const ticker = meta?.data?.ticker || meta?.data?.name || id;
  console.log(`  [${id}] Processing ${ticker}`);

  // Load rows
  let rows: any[];
  if (DRY_RUN && collectedRows) {
    rows = collectedRows.sort(
      (a: any, b: any) => Number(a.timestamp) - Number(b.timestamp),
    );
  } else {
    rows = await DAILY_RWA_DATA.findAll({
      where: { id },
      order: [["timestamp", "ASC"]],
      raw: true,
    }) as any[];
  }

  if (rows.length === 0) {
    console.log(`  [${id}] No data, skipping.`);
    return null;
  }

  const raw: ChartSeries[] = rows.map((r: any) => ({
    timestamp: Number(r.timestamp),
    mcap: Number(r.aggregatemcap) || sumObj(parseJson(r.mcap)),
    activeMcap: Number(r.aggregatedactivemcap) || sumObj(parseJson(r.activemcap)),
  }));

  // Phase 2: Spike removal
  const spikeTimestamps = detectSpikeTimestamps(
    rows.map((r: any) => ({
      timestamp: Number(r.timestamp),
      mcap: Number(r.aggregatemcap) || 0,
    })),
  );

  const rowsAfterSpikes = rows.filter(
    (r: any) => !spikeTimestamps.has(Number(r.timestamp)),
  );
  const afterSpikes: ChartSeries[] = rowsAfterSpikes.map((r: any) => ({
    timestamp: Number(r.timestamp),
    mcap: Number(r.aggregatemcap) || sumObj(parseJson(r.mcap)),
    activeMcap: Number(r.aggregatedactivemcap) || sumObj(parseJson(r.activemcap)),
  }));

  if (!DRY_RUN && spikeTimestamps.size > 0) {
    const tsArray = [...spikeTimestamps];
    await DAILY_RWA_DATA.destroy({
      where: { id, timestamp: { [Op.in]: tsArray } },
    });
    await DAILY_RWA_DATA.sequelize!.query(
      `DELETE FROM backup_rwa_data WHERE id = :id AND timestamp IN (:timestamps)`,
      { replacements: { id, timestamps: tsArray }, type: QueryTypes.DELETE },
    ).catch(() => {});
    console.log(`  [${id}] Deleted ${tsArray.length} spike rows`);
  }

  // Phase 3: Price-failure fix (parallel price fetches)
  const contracts: Record<string, string[]> | null = meta?.data?.contracts;
  let fixedRows = rowsAfterSpikes;
  let fixCount = 0;

  if (contracts && rowsAfterSpikes.length > 0) {
    const firstTs = Number(rowsAfterSpikes[0].timestamp);
    const lastTs = Number(rowsAfterSpikes[rowsAfterSpikes.length - 1].timestamp);
    const spanDays = Math.ceil((lastTs - firstTs) / 86400) + 1;

    const priceByChainTs = await fetchAllPriceCharts(contracts, firstTs, spanDays);
    const result = applyPriceFixes(rowsAfterSpikes, priceByChainTs);
    fixedRows = result.fixedRows;
    fixCount = result.fixCount;
  }

  const afterPriceFix: ChartSeries[] = fixedRows.map((r: any) => ({
    timestamp: Number(r.timestamp),
    mcap: Number(r.aggregatemcap) || sumObj(parseJson(r.mcap)),
    activeMcap: Number(r.aggregatedactivemcap) || sumObj(parseJson(r.activemcap)),
  }));

  // DB updates for price fixes
  if (!DRY_RUN && fixCount > 0) {
    const updates = fixedRows.filter((r: any) => r._modified);
    for (const upd of updates) {
      const mcapObj = parseJson(upd.mcap);
      const activemcapObj = parseJson(upd.activemcap);
      await DAILY_RWA_DATA.sequelize!.query(
        `UPDATE daily_rwa_data
         SET mcap = :mcap, activemcap = :activemcap,
             aggregatemcap = :aggregatemcap,
             aggregatedactivemcap = :aggregatedactivemcap,
             updated_at = NOW()
         WHERE id = :id AND timestamp = :ts`,
        {
          replacements: {
            mcap: JSON.stringify(mcapObj),
            activemcap: JSON.stringify(activemcapObj),
            aggregatemcap: sumObj(mcapObj),
            aggregatedactivemcap: sumObj(activemcapObj),
            id,
            ts: Number(upd.timestamp),
          },
          type: QueryTypes.UPDATE,
        },
      );
    }
    console.log(`  [${id}] Updated ${updates.length} rows in DB`);
  }

  console.log(`  [${id}] Done — spikes: ${spikeTimestamps.size}, price fixes: ${fixCount}`);

  return {
    id,
    ticker,
    raw,
    afterSpikes,
    afterPriceFix,
    spikeCount: spikeTimestamps.size,
    priceFixCount: fixCount,
  };
}

// ── HTML chart generation ────────────────────────────────────────────
function generateHtml(results: IdResult[]): string {
  const sections = results.map((r) => {
    const allTs = new Set<number>();
    r.raw.forEach((p) => allTs.add(p.timestamp));
    r.afterSpikes.forEach((p) => allTs.add(p.timestamp));
    r.afterPriceFix.forEach((p) => allTs.add(p.timestamp));
    const sorted = [...allTs].sort((a, b) => a - b);

    const rawMap = new Map(r.raw.map((p) => [p.timestamp, p.mcap]));
    const spikeMap = new Map(r.afterSpikes.map((p) => [p.timestamp, p.mcap]));
    const fixMap = new Map(r.afterPriceFix.map((p) => [p.timestamp, p.mcap]));
    const rawActiveMap = new Map(r.raw.map((p) => [p.timestamp, p.activeMcap]));
    const spikeActiveMap = new Map(r.afterSpikes.map((p) => [p.timestamp, p.activeMcap]));
    const fixActiveMap = new Map(r.afterPriceFix.map((p) => [p.timestamp, p.activeMcap]));

    const labels = sorted.map((ts) => `"${new Date(ts * 1000).toISOString().slice(0, 10)}"`).join(",");
    const rawData = sorted.map((ts) => ((rawMap.get(ts) || 0) / 1e6).toFixed(3)).join(",");
    const spikeData = sorted.map((ts) => {
      const v = spikeMap.get(ts);
      return v != null ? (v / 1e6).toFixed(3) : "null";
    }).join(",");
    const fixData = sorted.map((ts) => {
      const v = fixMap.get(ts);
      return v != null ? (v / 1e6).toFixed(3) : "null";
    }).join(",");
    const rawActiveData = sorted.map((ts) => ((rawActiveMap.get(ts) || 0) / 1e6).toFixed(3)).join(",");
    const spikeActiveData = sorted.map((ts) => {
      const v = spikeActiveMap.get(ts);
      return v != null ? (v / 1e6).toFixed(3) : "null";
    }).join(",");
    const fixActiveData = sorted.map((ts) => {
      const v = fixActiveMap.get(ts);
      return v != null ? (v / 1e6).toFixed(3) : "null";
    }).join(",");

    const safeId = `id_${r.id}`;

    return `
    <div style="margin-bottom: 60px;">
        <h2>${r.ticker} (ID ${r.id})</h2>
        <p style="color:#666;font-size:14px;">
            Spikes removed: <strong>${r.spikeCount}</strong> rows &nbsp;|&nbsp;
            Price dips fixed: <strong>${r.priceFixCount}</strong> rows &nbsp;|&nbsp;
            Final data points: <strong>${r.afterPriceFix.length}</strong>
        </p>
        <canvas id="chart_${safeId}" height="90"></canvas>
        <script>
            new Chart(document.getElementById("chart_${safeId}"), {
                type: "line",
                data: {
                    labels: [${labels}],
                    datasets: [
                        { label: "Raw DB aggregate ($M)", data: [${rawData}], borderColor: "#bbb", borderWidth: 1.5, borderDash: [5,3], pointRadius: 0, fill: false },
                        { label: "After spike removal aggregate ($M)", data: [${spikeData}], borderColor: "#f58231", borderWidth: 1.5, pointRadius: 0, fill: false, spanGaps: true },
                        { label: "After price fix aggregate ($M)", data: [${fixData}], borderColor: "#4363d8", borderWidth: 2, pointRadius: 0, fill: false, spanGaps: true },
                        { label: "Raw DB active ($M)", data: [${rawActiveData}], borderColor: "#888", borderWidth: 1, borderDash: [2,2], pointRadius: 0, fill: false },
                        { label: "After spike removal active ($M)", data: [${spikeActiveData}], borderColor: "#c2571a", borderWidth: 1, borderDash: [4,2], pointRadius: 0, fill: false, spanGaps: true },
                        { label: "After price fix active ($M)", data: [${fixActiveData}], borderColor: "#2a4494", borderWidth: 1.5, borderDash: [4,2], pointRadius: 0, fill: false, spanGaps: true },
                    ]
                },
                options: {
                    responsive: true,
                    interaction: { mode: "index", intersect: false },
                    plugins: { title: { display: true, text: "${r.ticker} — aggregateMcap (solid) vs activeMcap (dashed)" } },
                    scales: {
                        x: { ticks: { maxTicksLimit: 25 } },
                        y: { title: { display: true, text: "$ millions" } }
                    }
                }
            });
        </script>
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
    <title>RWA Refill + Cleanup Preview</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 1400px; margin: 0 auto; padding: 20px; background: #fafafa; }
        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 40px; }
        canvas { background: white; border: 1px solid #ddd; border-radius: 4px; padding: 10px; }
        .meta { color: #888; font-size: 13px; margin-bottom: 30px; }
    </style>
</head>
<body>
    <h1>RWA Refill + Cleanup Preview</h1>
    <p class="meta">
        Generated ${new Date().toISOString()}<br>
        IDs: ${results.map((r) => `${r.ticker} (${r.id})`).join(", ")}<br>
        DRY_RUN: ${DRY_RUN} — ${DRY_RUN ? "no DB changes made" : "changes applied to DB"}<br>
        Grey = raw DB. Orange = after spike removal. Blue = after price-failure fix (final).<br>
        Solid = aggregateMcap. Thin dashed = activeMcap.
    </p>
    ${sections}
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  await initPG();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  RWA Refill + Cleanup (Parallel)`);
  console.log(`  DRY_RUN: ${DRY_RUN}`);
  console.log(`  IDs: ${IDS.length} tokens`);
  console.log(`  Date range: ${START_DATE} to ${END_DATE}`);
  console.log(`  Concurrency: backfill=${BACKFILL_CONCURRENCY}, ids=${ID_CONCURRENCY}, priceFetch=${PRICE_FETCH_CONCURRENCY}`);
  console.log(`${"=".repeat(60)}`);

  // Phase 1: Backfill
  process.env.RWA_DRY_RUN = "false";
  const collectedRows = await runBackfill(START_DATE, END_DATE, IDS, DRY_RUN);

  // Group collected rows by ID (only used in DRY_RUN)
  const collectedById = new Map<string, any[]>();
  for (const row of collectedRows) {
    const arr = collectedById.get(row.id) || [];
    arr.push(row);
    collectedById.set(row.id, arr);
  }

  // Load metadata once (shared across all IDs)
  const allMetadata = await fetchMetadataPG();
  const metadataById = new Map(allMetadata.map((m: any) => [String(m.id), m]));

  // Phases 2+3: Process all IDs in parallel
  console.log(`\n── Phases 2+3: Spike removal + price fix (${IDS.length} IDs, concurrency=${ID_CONCURRENCY}) ──`);
  const results: IdResult[] = [];

  await runInPromisePool({
    items: IDS,
    concurrency: ID_CONCURRENCY,
    processor: async (id: string) => {
      const meta = metadataById.get(id);
      const collected = DRY_RUN ? (collectedById.get(id) || []) : null;
      const result = await processOneId(id, meta, collected);
      if (result) results.push(result);
    },
  });

  // Sort results back to original ID order for consistent output
  const idOrder = new Map(IDS.map((id, i) => [id, i]));
  results.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  // Phase 4: Generate HTML preview
  if (results.length > 0) {
    const html = generateHtml(results);
    const outPath = path.join(__dirname, "refill-preview.html");
    fs.writeFileSync(outPath, html);
    console.log(`\nChart written to ${outPath}`);
    console.log(`Open in browser: file://${outPath}`);
  }

  // Summary
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Summary (DRY_RUN: ${DRY_RUN}, elapsed: ${elapsed}s)`);
  for (const r of results) {
    console.log(`  ${r.ticker} (${r.id}): ${r.raw.length} raw -> ${r.afterPriceFix.length} final | spikes: ${r.spikeCount}, price fixes: ${r.priceFixCount}`);
  }
  console.log(`${"=".repeat(60)}`);

  process.exit();
}

main().catch((e) => { console.error(e); process.exit(1); });
// ts-node defi/src/rwa/cli/refillCleanParallel.ts
