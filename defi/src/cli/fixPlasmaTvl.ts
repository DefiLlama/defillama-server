import { dailyTokensTvl, dailyUsdTokensTvl, dailyRawTokensTvl, dailyTvl } from "../utils/getLastRecord";
import { getProtocolItems, saveProtocolItem, closeConnection } from "../api2/db";

const PROTOCOL_ID = "1599"; // Aave V3
const CHAIN = "plasma";
const START = Math.floor(new Date("2025-09-01").getTime() / 1e3);
const END = Math.floor(new Date("2026-03-01").getTime() / 1e3);

// Symbol-level tokens to strip (for dailyTokensTvl / dailyUsdTokensTvl)
const TOKENS_TO_STRIP = new Set([
  "PT-SUSDE-15JAN2026",
  "PT-USDE-15JAN2026",
  "PT-SUSDE-9APR2026",
  "PT-USDE-9APR2026",
  "usdt0",     // bare coingecko key (lowercase) — different from USDT0
  "ethereum",  // bare coingecko key — different from WETH/ETH
]);

// Raw address keys to strip (for dailyRawTokensTvl) — same tokens by on-chain address
const RAW_KEYS_TO_STRIP = new Set([
  "plasma:0x93b544c330f60a2aa05ced87aeeffb8d38fd8c9a",  // PT-USDE-15JAN2026
  "plasma:0x02fcc4989b4c9d435b7ced3fe1ba4cf77bbb5dd8",  // PT-SUSDE-15JAN2026
  "plasma:0xab509448ad489e2e1341e25cc500f2596464cc82",  // PT-SUSDE-9APR2026
  "plasma:0x54dc267be2839303ff1e323584a16e86cec4aa44",  // PT-USDE-9APR2026
  "usdt0",     // bare coingecko key
  "ethereum",  // bare coingecko key
]);

// If plasma USD TVL is above this, it needs fixing
const TVL_THRESHOLD = 1_500_000_000;

async function main() {
  if (process.env.DRY_RUN) console.log("=== DRY RUN MODE — no DB writes ===\n");

  // Fetch all four tables for the date range
  const [tvlItems, tokenItems, usdItems, rawItems] = await Promise.all([
    getProtocolItems(dailyTvl, PROTOCOL_ID, { timestampFrom: START, timestampTo: END }),
    getProtocolItems(dailyTokensTvl, PROTOCOL_ID, { timestampFrom: START, timestampTo: END }),
    getProtocolItems(dailyUsdTokensTvl, PROTOCOL_ID, { timestampFrom: START, timestampTo: END }),
    getProtocolItems(dailyRawTokensTvl, PROTOCOL_ID, { timestampFrom: START, timestampTo: END }),
  ]);

  console.log(`Loaded ${tvlItems.length} tvl, ${tokenItems.length} token, ${usdItems.length} usd, ${rawItems.length} raw records\n`);

  // Build lookups by timestamp (SK)
  const tvlByTs = new Map(tvlItems.map((i: any) => [i.SK, i]));
  const tokenByTs = new Map(tokenItems.map((i: any) => [i.SK, i]));
  const usdByTs = new Map(usdItems.map((i: any) => [i.SK, i]));
  const rawByTs = new Map(rawItems.map((i: any) => [i.SK, i]));

  const allTimestamps = [...new Set([
    ...tvlItems.map((i: any) => i.SK),
    ...tokenItems.map((i: any) => i.SK),
    ...usdItems.map((i: any) => i.SK),
  ])].sort((a: number, b: number) => a - b);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const ts of allTimestamps) {
    const timestamp = ts as number;
    const date = new Date(timestamp * 1e3).toISOString().slice(0, 10);
    const usdItem: any = usdByTs.get(ts);
    if (!usdItem) { skippedCount++; continue; }

    const plasmaUsd: any = usdItem.tvl?.[CHAIN] ?? usdItem[CHAIN] ?? {};
    const currentTotal: number = Object.values(plasmaUsd).reduce((sum: number, v: any) => sum + Number(v), 0);

    if (currentTotal < TVL_THRESHOLD) {
      skippedCount++;
      console.log(`${date}  $${(currentTotal / 1e9).toFixed(2)}B — OK`);
      continue;
    }

    const tokensFound = Object.keys(plasmaUsd).filter((k: string) => TOKENS_TO_STRIP.has(k));
    if (tokensFound.length === 0) {
      skippedCount++;
      console.log(`${date}  $${(currentTotal / 1e9).toFixed(2)}B — above threshold but no strip tokens, skipping`);
      continue;
    }

    const strippedUsdTotal = tokensFound.reduce((sum: number, k: string) => sum + Number(plasmaUsd[k] ?? 0), 0);
    const newTotal = currentTotal - strippedUsdTotal;
    console.log(`${date}  $${(currentTotal / 1e9).toFixed(2)}B -> $${(newTotal / 1e9).toFixed(2)}B  (stripping: ${tokensFound.join(", ")})`);

    if (process.env.DRY_RUN) { fixedCount++; continue; }

    // --- Fix dailyUsdTokensTvl ---
    const usdData = deepClone(usdItem);
    delete usdData.SK;
    stripTokensFromData(usdData, TOKENS_TO_STRIP);
    await saveProtocolItem(dailyUsdTokensTvl, { id: PROTOCOL_ID, timestamp, data: usdData }, { overwriteExistingData: true });
    console.log(`  -> saved dailyUsdTokensTvl`);

    // --- Fix dailyTokensTvl ---
    const tokenItem: any = tokenByTs.get(ts);
    if (tokenItem) {
      const tokenData = deepClone(tokenItem);
      delete tokenData.SK;
      stripTokensFromData(tokenData, TOKENS_TO_STRIP);
      await saveProtocolItem(dailyTokensTvl, { id: PROTOCOL_ID, timestamp, data: tokenData }, { overwriteExistingData: true });
      console.log(`  -> saved dailyTokensTvl`);
    }

    // --- Fix dailyRawTokensTvl ---
    const rawItem: any = rawByTs.get(ts);
    if (rawItem) {
      const rawData = deepClone(rawItem);
      delete rawData.SK;
      stripTokensFromData(rawData, RAW_KEYS_TO_STRIP);
      await saveProtocolItem(dailyRawTokensTvl, { id: PROTOCOL_ID, timestamp, data: rawData }, { overwriteExistingData: true });
      console.log(`  -> saved dailyRawTokensTvl`);
    }

    // --- Fix dailyTvl ---
    const tvlItem: any = tvlByTs.get(ts);
    if (tvlItem) {
      const tvlData = deepClone(tvlItem);
      delete tvlData.SK;
      adjustTvlTotals(tvlData, strippedUsdTotal);
      await saveProtocolItem(dailyTvl, { id: PROTOCOL_ID, timestamp, data: tvlData }, { overwriteExistingData: true });
      console.log(`  -> saved dailyTvl`);
    }

    fixedCount++;
  }

  console.log(`\nDone. Fixed: ${fixedCount}, Skipped: ${skippedCount}`);
  await closeConnection();
}

// Remove keys matching the stripSet from chain-specific and merged "tvl" keys
function stripTokensFromData(data: any, stripSet: Set<string>) {
  // data[plasma] = { key: amount, ... }
  if (data[CHAIN] && typeof data[CHAIN] === "object") {
    for (const key of Object.keys(data[CHAIN])) {
      if (stripSet.has(key)) delete data[CHAIN][key];
    }
  }

  // data.tvl = { key: mergedAmount, ... } (merged across all chains)
  if (data.tvl && typeof data.tvl === "object") {
    for (const key of Object.keys(data.tvl)) {
      if (stripSet.has(key)) delete data.tvl[key];
    }
  }
}

// Subtract the stripped USD amount from chain and overall totals in dailyTvl
function adjustTvlTotals(data: any, amountToSubtract: number) {
  if (typeof data[CHAIN] === "number") {
    data[CHAIN] -= amountToSubtract;
  }

  if (typeof data.tvl === "number") {
    data.tvl -= amountToSubtract;
  } else if (data.tvl && typeof data.tvl === "object" && typeof data.tvl[CHAIN] === "number") {
    data.tvl[CHAIN] -= amountToSubtract;
  }
}

function deepClone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
}); // DRY_RUN=1 ts-node defi/src/cli/fixPlasmaTvl.ts
