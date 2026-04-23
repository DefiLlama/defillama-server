import fetch from "node-fetch";

// Handler imports (local serverless functions)
import getCoinsHandler from "./getCoins";
import getMcapsHandler from "./getMcaps";
import getChainsHandler from "./getChains";
import getCoinPricesHandler from "./getCoinPrices";
import postCurrentCoinsHandler from "./postCurrentCoins";
import postHistoricalCoinsHandler from "./postHistoricalCoins";
import getCurrentCoinsHandler from "./getCurrentCoins";
import getHistoricalCoinsHandler from "./getHistoricalCoins";
import getCoinPriceChartHandler from "./getCoinPriceChart";
import getBatchHistoricalHandler from "./getBatchHistoricalCoins";
import getPercentageChangeHandler from "./getPercentageChange";
import getVolumeHandler from "./getVolume";
import getBlockHandler, { batchBlocks as batchBlocksHandler } from "./getBlock";
import getCoinFirstTimestampHandler from "./getCoinFirstTimestamp";

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

const PROD = "https://coins.llama.fi";
const PRICE_TOLERANCE = 0.05; // 5% tolerance
const TIMESTAMP_TOLERANCE = 600; // 10 min

// ──────────────────────────────────────────────
// Coin sets
// ──────────────────────────────────────────────

const ETHEREUM_USDC = "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ETHEREUM_USDT = "ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ETHEREUM_WETH = "ethereum:0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const BSC_BUSD = "bsc:0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
const BSC_CAKE = "bsc:0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";
const AVAX_USDT = "avax:0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7";
const POLYGON_USDC = "polygon:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ARBITRUM_USDC = "arbitrum:0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const SOLANA_SOL = "solana:So11111111111111111111111111111111111111112";
const SOLANA_MSOL = "solana:mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
const SOLANA_BONK = "solana:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const CG_ETH = "coingecko:ethereum";
const CG_BTC = "coingecko:bitcoin";
const CG_SOL = "coingecko:solana";

const STANDARD_COINS = [ETHEREUM_USDC, BSC_BUSD, CG_ETH];
const STABLECOIN_SET = [ETHEREUM_USDC, ETHEREUM_USDT, AVAX_USDT, POLYGON_USDC, ARBITRUM_USDC];
const MULTI_CHAIN_SET = [
  ETHEREUM_USDC, ETHEREUM_WETH, BSC_BUSD, BSC_CAKE,
  AVAX_USDT, POLYGON_USDC, ARBITRUM_USDC,
  SOLANA_SOL, CG_ETH, CG_BTC,
];
const CASE_SENSITIVE_COINS = [SOLANA_SOL, SOLANA_MSOL, SOLANA_BONK];
const REDIRECT_COINS = [CG_ETH, CG_BTC, CG_SOL];
const INVALID_COINS = [
  "fakechain:0xdeadbeef",
  "ethereum:0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead",
];
const MIXED_CASE_COINS = [
  "ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
];
const LARGE_COIN_SET = [
  ...MULTI_CHAIN_SET,
  ETHEREUM_USDT, SOLANA_MSOL, SOLANA_BONK,
  "coingecko:cardano", "coingecko:polkadot", "coingecko:avalanche-2",
  "coingecko:chainlink", "coingecko:uniswap", "coingecko:aave",
  "coingecko:maker", "coingecko:compound-governance-token",
  "ethereum:0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  "ethereum:0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
  "ethereum:0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
  "arbitrum:0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH arb
  "polygon:0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH poly
  "bsc:0x2170Ed0880ac9A755fd29B2688956BD959F933F8",     // ETH on BSC
  "avax:0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",    // WAVAX
];

// Timestamps
const TS_JUL_2022 = 1656944730;
const TS_AUG_2022 = 1659623130;
const TS_JAN_2023 = 1672531200;
const TS_JUL_2023 = 1688169600;
const TS_JAN_2024 = 1704067200;
const TS_JAN_2021 = 1609459200;
const TS_VERY_OLD = 946684800;
const CHART_START = 1704067200; // Jan 1 2024

// ──────────────────────────────────────────────
// Helpers: invoke local handler & parse response
// ──────────────────────────────────────────────

function parseHandlerResponse(raw: any): any {
  if (!raw || typeof raw === "string") throw new Error(`Handler returned: ${raw}`);
  return JSON.parse(raw.body);
}

// Local handler wrappers

async function localGetChains(): Promise<any> {
  return parseHandlerResponse(await getChainsHandler({} as any));
}

async function localGetCurrentCoins(coins: string, qs: Record<string, string> = {}): Promise<any> {
  return parseHandlerResponse(await getCurrentCoinsHandler({
    pathParameters: { coins },
    queryStringParameters: qs,
  } as any));
}

async function localGetHistorical(timestamp: string, coins: string, qs: Record<string, string> = {}): Promise<any> {
  return parseHandlerResponse(await getHistoricalCoinsHandler({
    pathParameters: { timestamp, coins },
    queryStringParameters: qs,
  } as any));
}

async function localGetFirstTimestamp(coins: string): Promise<any> {
  return parseHandlerResponse(await getCoinFirstTimestampHandler({
    pathParameters: { coins },
  } as any));
}

async function localGetChart(coins: string, qs: Record<string, string>): Promise<any> {
  return parseHandlerResponse(await getCoinPriceChartHandler({
    pathParameters: { coins },
    queryStringParameters: qs,
  } as any));
}

async function localGetBatchHistorical(coinsObj: Record<string, number[]>, searchWidth = "6h"): Promise<any> {
  return parseHandlerResponse(await getBatchHistoricalHandler({
    queryStringParameters: {
      coins: JSON.stringify(coinsObj),
      searchWidth,
    },
  } as any));
}

async function localGetPercentage(coins: string, qs: Record<string, string>): Promise<any> {
  return parseHandlerResponse(await getPercentageChangeHandler({
    pathParameters: { coins },
    queryStringParameters: qs,
  } as any));
}

async function localGetVolume(coins: string, qs: Record<string, string>): Promise<any> {
  return parseHandlerResponse(await getVolumeHandler({
    pathParameters: { coins },
    queryStringParameters: qs,
  } as any));
}

async function localGetBlock(chain: string, timestamp: string): Promise<any> {
  return parseHandlerResponse(await getBlockHandler({
    pathParameters: { chain, timestamp },
  } as any));
}

async function localPostBlocks(chain: string, timestamps: number[]): Promise<any> {
  return parseHandlerResponse(await batchBlocksHandler({
    pathParameters: { chain },
    body: JSON.stringify({ timestamps }),
  } as any));
}

async function localPostPrices(coins: string[], timestamp?: number): Promise<any> {
  return parseHandlerResponse(await getCoinsHandler({
    body: JSON.stringify({ coins, ...(timestamp !== undefined && { timestamp }) }),
  } as any));
}

async function localPostMcaps(coins: string[]): Promise<any> {
  return parseHandlerResponse(await getMcapsHandler({
    body: JSON.stringify({ coins }),
  } as any));
}

async function localPostCoinTimestamps(coin: string, timestamps: number[]): Promise<any> {
  return parseHandlerResponse(await getCoinPricesHandler({
    body: JSON.stringify({ coin, timestamps }),
  } as any));
}

async function localPostCurrent(coins: string[]): Promise<any> {
  return parseHandlerResponse(await postCurrentCoinsHandler({
    body: JSON.stringify({ coins }),
  } as any));
}

async function localPostHistorical(coinsObj: Record<string, number[]>): Promise<any> {
  return parseHandlerResponse(await postHistoricalCoinsHandler({
    body: JSON.stringify({ coins: coinsObj }),
  } as any));
}

// Prod fetch wrappers

async function prodGet(path: string): Promise<any> {
  const res = await fetch(`${PROD}${path}`);
  if (!res.ok) throw new Error(`PROD GET ${path} → ${res.status}`);
  return res.json();
}

async function prodPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${PROD}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`PROD POST ${path} → ${res.status}`);
  return res.json();
}

// ──────────────────────────────────────────────
// Comparison helpers
// ──────────────────────────────────────────────

function expectPriceClose(actual: number, expected: number, label: string, tolerance = PRICE_TOLERANCE) {
  if (actual === 0 && expected === 0) return;
  const denom = Math.max(Math.abs(actual), Math.abs(expected));
  if (denom === 0) return;
  const pctDiff = Math.abs(actual - expected) / denom;
  if (pctDiff >= tolerance) {
    throw new Error(
      `${label}: prices differ by ${(pctDiff * 100).toFixed(2)}% (local=${actual}, prod=${expected}), tolerance=${tolerance * 100}%`,
    );
  }
}

function compareFlatCoins(local: Record<string, any>, prod: Record<string, any>, label: string) {
  const localKeys = Object.keys(local).sort();
  const prodKeys = Object.keys(prod).sort();
  expect(localKeys).toEqual(prodKeys);
  for (const key of localKeys) {
    expectPriceClose(local[key].price, prod[key].price, `${label} ${key}`);
    expect(local[key].symbol).toEqual(prod[key].symbol);
    expect(local[key].decimals).toEqual(prod[key].decimals);
    if (local[key].timestamp && prod[key].timestamp) {
      expect(Math.abs(local[key].timestamp - prod[key].timestamp)).toBeLessThan(TIMESTAMP_TOLERANCE);
    }
  }
}

function compareHistoricalCoins(local: Record<string, any>, prod: Record<string, any>, label: string) {
  const localKeys = Object.keys(local).sort();
  const prodKeys = Object.keys(prod).sort();
  expect(localKeys).toEqual(prodKeys);
  const sortByTs = (a: any, b: any) => a.timestamp - b.timestamp;
  for (const key of localKeys) {
    expect(local[key].symbol).toEqual(prod[key].symbol);
    const lp = [...local[key].prices].sort(sortByTs);
    const pp = [...prod[key].prices].sort(sortByTs);
    expect(lp.length).toEqual(pp.length);
    for (let i = 0; i < lp.length; i++) {
      expectPriceClose(lp[i].price, pp[i].price, `${label} ${key}[${i}]`);
      expect(Math.abs(lp[i].timestamp - pp[i].timestamp)).toBeLessThan(TIMESTAMP_TOLERANCE);
    }
  }
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function buildCoinsObj(coins: string[], timestamps: number[]): Record<string, number[]> {
  const obj: Record<string, number[]> = {};
  for (const c of coins) obj[c] = timestamps;
  return obj;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// ══════════════════════════════════════════════
// GET /prices/current/{coins} — local vs prod
// ══════════════════════════════════════════════

describe("GET /prices/current/{coins}", () => {
  it("standard coins match prod", async () => {
    const coins = STANDARD_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/standard");
  }, 30_000);

  it("single coin matches prod", async () => {
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(ETHEREUM_USDC),
      prodGet(`/prices/current/${ETHEREUM_USDC}`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/single");
  }, 15_000);

  it("stablecoins match prod (all ~$1)", async () => {
    const coins = STABLECOIN_SET.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/stablecoins");
    for (const key of Object.keys(local.coins)) {
      expectPriceClose(local.coins[key].price, 1.0, `stablecoin ${key}`);
    }
  }, 30_000);

  it("multi-chain batch matches prod", async () => {
    const coins = MULTI_CHAIN_SET.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/multichain");
  }, 30_000);

  it("large batch (25+ coins) matches prod", async () => {
    const coins = LARGE_COIN_SET.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/large");
    expect(Object.keys(local.coins).length).toBeGreaterThan(15);
  }, 60_000);

  it("invalid coins return empty — matches prod", async () => {
    const coins = INVALID_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins),
      prodGet(`/prices/current/${coins}`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 15_000);

  it("mixed valid + invalid matches prod", async () => {
    const coins = [...STANDARD_COINS, ...INVALID_COINS].join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/mixed");
    expect(Object.keys(local.coins).length).toBeGreaterThan(0);
  }, 30_000);

  it("duplicate coins match prod", async () => {
    const coins = [ETHEREUM_USDC, ETHEREUM_USDC, ETHEREUM_USDC].join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins),
      prodGet(`/prices/current/${coins}`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/dupes");
  }, 15_000);

  it("mixed case addresses match prod", async () => {
    const coins = MIXED_CASE_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/mixedcase");
  }, 15_000);

  it("case-sensitive solana addresses match prod", async () => {
    const coins = CASE_SENSITIVE_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/solana");
  }, 30_000);

  it("coingecko redirect coins match prod", async () => {
    const coins = REDIRECT_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(coins, { searchWidth: "12h" }),
      prodGet(`/prices/current/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "current/redirects");
  }, 15_000);

  it("searchWidth=1m returns same key set as prod", async () => {
    const [local, prod] = await Promise.all([
      localGetCurrentCoins(ETHEREUM_USDC, { searchWidth: "1m" }),
      prodGet(`/prices/current/${ETHEREUM_USDC}?searchWidth=1m`),
    ]);
    // narrow search window may have slightly different timestamps, just check same coins returned
    expect(Object.keys(local.coins).sort()).toEqual(Object.keys(prod.coins).sort());
  }, 15_000);

  it("timestamps are recent (within 24h)", async () => {
    const local = await localGetCurrentCoins(STANDARD_COINS.join(","), { searchWidth: "12h" });
    const now = nowUnix();
    for (const key of Object.keys(local.coins)) {
      expect(now - local.coins[key].timestamp).toBeLessThan(86400);
    }
  }, 15_000);
});

// ══════════════════════════════════════════════
// GET /prices/historical/{timestamp}/{coins} — local vs prod
// ══════════════════════════════════════════════

describe("GET /prices/historical/{timestamp}/{coins}", () => {
  it("standard coins at Jul 2022 match prod", async () => {
    const coins = STANDARD_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetHistorical(String(TS_JUL_2022), coins),
      prodGet(`/prices/historical/${TS_JUL_2022}/${coins}`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "historical/jul2022");
  }, 30_000);

  it("multi-chain at Jan 2023 matches prod", async () => {
    const coins = MULTI_CHAIN_SET.join(",");
    const [local, prod] = await Promise.all([
      localGetHistorical(String(TS_JAN_2023), coins, { searchWidth: "12h" }),
      prodGet(`/prices/historical/${TS_JAN_2023}/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "historical/jan2023");
  }, 30_000);

  it("very old timestamp returns empty — matches prod", async () => {
    const [local, prod] = await Promise.all([
      localGetHistorical(String(TS_VERY_OLD), ETHEREUM_USDC),
      prodGet(`/prices/historical/${TS_VERY_OLD}/${ETHEREUM_USDC}`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 15_000);

  it("invalid coins return empty — matches prod", async () => {
    const coins = INVALID_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetHistorical(String(TS_JUL_2022), coins),
      prodGet(`/prices/historical/${TS_JUL_2022}/${coins}`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 15_000);

  it("stablecoins at Jan 2023 are ~$1 — matches prod", async () => {
    const coins = STABLECOIN_SET.join(",");
    const [local, prod] = await Promise.all([
      localGetHistorical(String(TS_JAN_2023), coins, { searchWidth: "12h" }),
      prodGet(`/prices/historical/${TS_JAN_2023}/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "historical/stables");
    for (const key of Object.keys(local.coins)) {
      expectPriceClose(local.coins[key].price, 1.0, `stablecoin historical ${key}`);
    }
  }, 30_000);

  it("recent timestamp (1h ago) matches prod", async () => {
    const ts = String(nowUnix() - 3600);
    const coins = STANDARD_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetHistorical(ts, coins, { searchWidth: "12h" }),
      prodGet(`/prices/historical/${ts}/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "historical/recent");
  }, 30_000);

  it("case-sensitive chains at Jan 2024 match prod", async () => {
    const coins = CASE_SENSITIVE_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetHistorical(String(TS_JAN_2024), coins, { searchWidth: "12h" }),
      prodGet(`/prices/historical/${TS_JAN_2024}/${coins}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "historical/solana");
  }, 30_000);

  it("searchWidth=12h vs default matches prod", async () => {
    const [local, prod] = await Promise.all([
      localGetHistorical(String(TS_JAN_2024), CG_ETH, { searchWidth: "12h" }),
      prodGet(`/prices/historical/${TS_JAN_2024}/${CG_ETH}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "historical/searchwidth");
  }, 15_000);

  it("ETH price at Jan 2023 sanity check (local)", async () => {
    const local = await localGetHistorical(String(TS_JAN_2023), CG_ETH, { searchWidth: "12h" });
    const ethPrice = (Object.values(local.coins)[0] as any)?.price;
    expect(ethPrice).toBeGreaterThan(800);
    expect(ethPrice).toBeLessThan(1800);
  }, 15_000);

  it("future timestamp returns empty (local)", async () => {
    const future = String(nowUnix() + 86400 * 365);
    const local = await localGetHistorical(future, CG_ETH);
    expect(Object.keys(local.coins).length).toBe(0);
  }, 15_000);
});

// ══════════════════════════════════════════════
// GET /prices/first/{coins} — local vs prod
// ══════════════════════════════════════════════

describe("GET /prices/first/{coins}", () => {
  it("well-known coins match prod", async () => {
    const coins = `${CG_ETH},${CG_BTC}`;
    const [local, prod] = await Promise.all([
      localGetFirstTimestamp(coins),
      prodGet(`/prices/first/${coins}`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "first/known");
  }, 30_000);

  it("invalid coins return empty — matches prod", async () => {
    const coins = INVALID_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetFirstTimestamp(coins),
      prodGet(`/prices/first/${coins}`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 15_000);

  it("single coin matches prod", async () => {
    const [local, prod] = await Promise.all([
      localGetFirstTimestamp(ETHEREUM_USDC),
      prodGet(`/prices/first/${ETHEREUM_USDC}`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "first/single");
  }, 15_000);

  it("multi-chain matches prod", async () => {
    const coins = MULTI_CHAIN_SET.join(",");
    const [local, prod] = await Promise.all([
      localGetFirstTimestamp(coins),
      prodGet(`/prices/first/${coins}`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "first/multichain");
  }, 30_000);

  it("ETH first timestamp is before 2020 (local)", async () => {
    const local = await localGetFirstTimestamp(CG_ETH);
    const coin = Object.values(local.coins)[0] as any;
    expect(coin.timestamp).toBeLessThan(1577836800);
  }, 15_000);
});

// ══════════════════════════════════════════════
// GET /chart/{coins} — local vs prod
// ══════════════════════════════════════════════

describe("GET /chart/{coins}", () => {
  it("7 daily points match prod", async () => {
    const qs = { start: String(CHART_START), span: "7", period: "1d" };
    const [local, prod] = await Promise.all([
      localGetChart(CG_ETH, qs),
      prodGet(`/chart/${CG_ETH}?start=${CHART_START}&span=7&period=1d`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/7d");
  }, 30_000);

  it("24 hourly points match prod", async () => {
    const qs = { start: String(CHART_START), span: "24", period: "1h" };
    const [local, prod] = await Promise.all([
      localGetChart(CG_ETH, qs),
      prodGet(`/chart/${CG_ETH}?start=${CHART_START}&span=24&period=1h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/24h");
  }, 30_000);

  it("12 x 5-min points match prod (range query path)", async () => {
    const qs = { start: String(CHART_START), span: "12", period: "5m" };
    const [local, prod] = await Promise.all([
      localGetChart(CG_ETH, qs),
      prodGet(`/chart/${CG_ETH}?start=${CHART_START}&span=12&period=5m`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/5m");
  }, 30_000);

  it("30 daily points match prod (per-timestamp path)", async () => {
    const qs = { start: String(CHART_START), span: "30", period: "1d" };
    const [local, prod] = await Promise.all([
      localGetChart(CG_ETH, qs),
      prodGet(`/chart/${CG_ETH}?start=${CHART_START}&span=30&period=1d`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/30d");
  }, 30_000);

  it("60 x 30-min points match prod", async () => {
    const qs = { start: String(CHART_START), span: "60", period: "30m" };
    const [local, prod] = await Promise.all([
      localGetChart(CG_ETH, qs),
      prodGet(`/chart/${CG_ETH}?start=${CHART_START}&span=60&period=30m`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/30m");
  }, 30_000);

  it("single coin 90 daily points matches prod", async () => {
    const qs = { start: String(CHART_START), span: "90", period: "1d" };
    const [local, prod] = await Promise.all([
      localGetChart(CG_ETH, qs),
      prodGet(`/chart/${CG_ETH}?start=${CHART_START}&span=90&period=1d`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/90d");
  }, 60_000);

  it("multiple coins match prod", async () => {
    const coins = `${CG_ETH},${CG_BTC}`;
    const qs = { start: String(CHART_START), span: "7", period: "1d" };
    const [local, prod] = await Promise.all([
      localGetChart(coins, qs),
      prodGet(`/chart/${coins}?start=${CHART_START}&span=7&period=1d`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/multi");
  }, 30_000);

  it("end parameter matches prod", async () => {
    const end = CHART_START + 86400 * 7;
    const qs = { end: String(end), span: "7", period: "1d" };
    const [local, prod] = await Promise.all([
      localGetChart(CG_ETH, qs),
      prodGet(`/chart/${CG_ETH}?end=${end}&span=7&period=1d`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/end");
  }, 30_000);

  it("starknet + coingecko mixed coins match prod", async () => {
    const coins = "starknet:0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb,coingecko:ethereum";
    const qs = { start: String(CHART_START), span: "7", period: "1d" };
    const [local, prod] = await Promise.all([
      localGetChart(coins, qs),
      prodGet(`/chart/${coins}?start=${CHART_START}&span=7&period=1d`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "chart/starknet");
  }, 30_000);

  it("chart stablecoin prices stay near $1 (local)", async () => {
    const local = await localGetChart(ETHEREUM_USDC, { start: String(CHART_START), span: "7", period: "1d" });
    const coin = Object.values(local.coins)[0] as any;
    for (const p of coin.prices) {
      expectPriceClose(p.price, 1.0, `USDC chart ts=${p.timestamp}`);
    }
  }, 30_000);

  it("max records limit triggers error (local)", async () => {
    const manyCoins = [CG_ETH, CG_BTC, CG_SOL, "coingecko:cardano", "coingecko:polkadot", "coingecko:avalanche-2"].join(",");
    const raw = await getCoinPriceChartHandler({
      pathParameters: { coins: manyCoins },
      queryStringParameters: { start: String(CHART_START), span: "100", period: "1h" },
    } as any);
    const body = JSON.parse((raw as any).body);
    expect(body.message).toMatch(/exceed/i);
  }, 15_000);
});

// ══════════════════════════════════════════════
// GET /batchHistorical — local vs prod
// ══════════════════════════════════════════════

describe("GET /batchHistorical", () => {
  it("standard coins with multiple timestamps match prod", async () => {
    const coinsObj = { [CG_ETH]: [TS_JUL_2022, TS_AUG_2022], [CG_BTC]: [TS_JAN_2023] };
    const [local, prod] = await Promise.all([
      localGetBatchHistorical(coinsObj, "12h"),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "batch/standard");
  }, 30_000);

  it("4 timestamps per coin match prod", async () => {
    const coinsObj = { [CG_ETH]: [TS_JUL_2022, TS_AUG_2022, TS_JAN_2023, TS_JUL_2023] };
    const [local, prod] = await Promise.all([
      localGetBatchHistorical(coinsObj, "12h"),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "batch/4ts");
    const ethLocal = Object.values(local.coins)[0] as any;
    expect(ethLocal.prices.length).toBe(4);
  }, 30_000);

  it("different timestamps per coin match prod", async () => {
    const coinsObj = {
      [CG_ETH]: [TS_JUL_2022],
      [CG_BTC]: [TS_JAN_2023, TS_JUL_2023],
      [ETHEREUM_USDC]: [TS_JAN_2024],
    };
    const [local, prod] = await Promise.all([
      localGetBatchHistorical(coinsObj, "12h"),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "batch/diffts");
  }, 30_000);

  it("invalid coins return empty — matches prod", async () => {
    const coinsObj = { "fakechain:0xdead": [TS_JUL_2022] };
    const [local, prod] = await Promise.all([
      localGetBatchHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=6h`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 15_000);

  it("returns all requested timestamps regardless of input order (local)", async () => {
    const coinsObj = { [CG_ETH]: [TS_JAN_2024, TS_JUL_2022, TS_JAN_2023] };
    const local = await localGetBatchHistorical(coinsObj, "12h");
    const ethData = Object.values(local.coins)[0] as any;
    expect(ethData.prices.length).toBe(3);
    const timestamps = ethData.prices.map((p: any) => p.timestamp).sort();
    // all 3 requested timestamps should be represented
    expect(timestamps.length).toBe(3);
  }, 15_000);

  it("large batch (many coins, 3 timestamps) matches prod", async () => {
    const coinsObj = buildCoinsObj([...STANDARD_COINS, ...REDIRECT_COINS], [TS_JUL_2022, TS_JAN_2023, TS_JUL_2023]);
    const [local, prod] = await Promise.all([
      localGetBatchHistorical(coinsObj, "12h"),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "batch/large");
  }, 60_000);

  it("ETH prices are sane across timestamps (local)", async () => {
    const coinsObj = { [CG_ETH]: [TS_JAN_2021, TS_JUL_2022, TS_JAN_2024] };
    const local = await localGetBatchHistorical(coinsObj, "12h");
    const ethData = Object.values(local.coins)[0] as any;
    for (const p of ethData.prices) {
      expect(p.price).toBeGreaterThan(100);
      expect(p.price).toBeLessThan(5000);
    }
  }, 30_000);
});

// ══════════════════════════════════════════════
// GET /percentage/{coins} — local vs prod
// ══════════════════════════════════════════════

describe("GET /percentage/{coins}", () => {
  it("1d period matches prod", async () => {
    const qs = { period: "1d", timestamp: String(TS_JAN_2024) };
    const [local, prod] = await Promise.all([
      localGetPercentage(CG_ETH, qs),
      prodGet(`/percentage/${CG_ETH}?period=1d&timestamp=${TS_JAN_2024}`),
    ]);
    const localKeys = Object.keys(local.coins).sort();
    const prodKeys = Object.keys(prod.coins).sort();
    expect(localKeys).toEqual(prodKeys);
    for (const key of localKeys) {
      expect(Math.abs((local.coins[key] as number) - (prod.coins[key] as number))).toBeLessThan(1);
    }
  }, 30_000);

  it("7d period matches prod", async () => {
    const qs = { period: "7d", timestamp: String(TS_JAN_2024) };
    const [local, prod] = await Promise.all([
      localGetPercentage(CG_ETH, qs),
      prodGet(`/percentage/${CG_ETH}?period=7d&timestamp=${TS_JAN_2024}`),
    ]);
    const localKeys = Object.keys(local.coins).sort();
    const prodKeys = Object.keys(prod.coins).sort();
    expect(localKeys).toEqual(prodKeys);
  }, 30_000);

  it("multiple coins match prod", async () => {
    const coins = `${CG_ETH},${CG_BTC}`;
    const qs = { period: "1d", timestamp: String(TS_JAN_2024) };
    const [local, prod] = await Promise.all([
      localGetPercentage(coins, qs),
      prodGet(`/percentage/${coins}?period=1d&timestamp=${TS_JAN_2024}`),
    ]);
    expect(Object.keys(local.coins).sort()).toEqual(Object.keys(prod.coins).sort());
  }, 30_000);

  it("invalid coins return empty — matches prod", async () => {
    const coins = INVALID_COINS.join(",");
    const [local, prod] = await Promise.all([
      localGetPercentage(coins, { period: "1d" }),
      prodGet(`/percentage/${coins}?period=1d`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 15_000);

  it("lookForward=true matches prod", async () => {
    const qs = { period: "1d", timestamp: String(TS_JAN_2024), lookForward: "true" };
    const [local, prod] = await Promise.all([
      localGetPercentage(CG_ETH, qs),
      prodGet(`/percentage/${CG_ETH}?period=1d&timestamp=${TS_JAN_2024}&lookForward=true`),
    ]);
    expect(Object.keys(local.coins).sort()).toEqual(Object.keys(prod.coins).sort());
  }, 30_000);

  it("stablecoin percentage change is small (local)", async () => {
    const local = await localGetPercentage(ETHEREUM_USDC, { period: "1d", timestamp: String(TS_JAN_2024) });
    if (Object.keys(local.coins).length > 0) {
      const pct = Object.values(local.coins)[0] as number;
      expect(Math.abs(pct)).toBeLessThan(5);
    }
  }, 15_000);
});

// ══════════════════════════════════════════════
// POST /mcaps — local vs prod
// ══════════════════════════════════════════════

describe("POST /mcaps", () => {
  it("well-known coins match prod", async () => {
    const coins = [CG_ETH, CG_BTC];
    const [local, prod] = await Promise.all([
      localPostMcaps(coins),
      prodPost("/mcaps", { coins }),
    ]);
    const localKeys = Object.keys(local).sort();
    const prodKeys = Object.keys(prod).sort();
    expect(localKeys).toEqual(prodKeys);
    for (const key of localKeys) {
      expectPriceClose(local[key].mcap, prod[key].mcap, `mcap ${key}`, 0.10);
    }
  }, 30_000);

  it("mixed valid + invalid coins match prod", async () => {
    const coins = [...REDIRECT_COINS, ...INVALID_COINS];
    const [local, prod] = await Promise.all([
      localPostMcaps(coins),
      prodPost("/mcaps", { coins }),
    ]);
    expect(Object.keys(local).sort()).toEqual(Object.keys(prod).sort());
  }, 30_000);
});

// ══════════════════════════════════════════════
// POST /coin/timestamps — local vs prod
// ══════════════════════════════════════════════

describe("POST /coin/timestamps", () => {
  it("ETH at multiple timestamps matches prod", async () => {
    const timestamps = [TS_JUL_2022, TS_JAN_2023, TS_JAN_2024];
    const [local, prod] = await Promise.all([
      localPostCoinTimestamps(CG_ETH, timestamps),
      prodPost("/coin/timestamps", { coin: CG_ETH, timestamps }),
    ]);
    expect(local.symbol).toEqual(prod.symbol);
    expect(local.prices.length).toBe(prod.prices.length);
    const sortByTs = (a: any, b: any) => a.timestamp - b.timestamp;
    local.prices.sort(sortByTs);
    prod.prices.sort(sortByTs);
    for (let i = 0; i < local.prices.length; i++) {
      expectPriceClose(local.prices[i].price, prod.prices[i].price, `coinTs ETH[${i}]`);
      expect(Math.abs(local.prices[i].timestamp - prod.prices[i].timestamp)).toBeLessThan(TIMESTAMP_TOLERANCE);
    }
  }, 30_000);

  it("USDC at 2 timestamps matches prod (prices ~$1)", async () => {
    const timestamps = [TS_JUL_2022, TS_AUG_2022];
    const [local, prod] = await Promise.all([
      localPostCoinTimestamps(ETHEREUM_USDC, timestamps),
      prodPost("/coin/timestamps", { coin: ETHEREUM_USDC, timestamps }),
    ]);
    expect(local.prices.length).toBe(prod.prices.length);
    for (const p of local.prices) {
      expectPriceClose(p.price, 1.0, "USDC coinTs");
    }
  }, 30_000);

  it("single timestamp matches prod", async () => {
    const [local, prod] = await Promise.all([
      localPostCoinTimestamps(CG_ETH, [TS_JAN_2024]),
      prodPost("/coin/timestamps", { coin: CG_ETH, timestamps: [TS_JAN_2024] }),
    ]);
    expect(local.prices.length).toBe(1);
    expect(prod.prices.length).toBe(1);
    expectPriceClose(local.prices[0].price, prod.prices[0].price, "coinTs single");
  }, 15_000);
});

// ══════════════════════════════════════════════
// POST /pro/prices/current — chunked comparison
// (big list POST vs chunked GET calls)
// ══════════════════════════════════════════════

describe("POST /pro/prices/current — big list vs chunked GET", () => {
  async function localChunkedGetCurrent(coins: string[], chunkSize: number): Promise<Record<string, any>> {
    const chunks_ = chunk(coins, chunkSize);
    const results = await Promise.all(
      chunks_.map((c) => localGetCurrentCoins(c.join(","), { searchWidth: "12h" }).then((r) => r.coins)),
    );
    const merged: Record<string, any> = {};
    for (const r of results) for (const [k, v] of Object.entries(r)) merged[k] = v;
    return merged;
  }

  it("full POST matches chunked GET (chunks of 5) — local", async () => {
    const [postResult, getResult] = await Promise.all([
      localPostCurrent(LARGE_COIN_SET).then((r) => r.coins),
      localChunkedGetCurrent(LARGE_COIN_SET, 5),
    ]);
    const postKeys = Object.keys(postResult).sort();
    const getKeys = Object.keys(getResult).sort();
    expect(postKeys.length).toBeGreaterThan(10);
    const commonKeys = postKeys.filter((k) => getKeys.includes(k));
    expect(commonKeys.length).toBeGreaterThan(10);
    for (const key of commonKeys) {
      expectPriceClose(postResult[key].price, getResult[key].price, `POSTcur vs GETchunk ${key}`);
      expect(postResult[key].symbol).toEqual(getResult[key].symbol);
      expect(postResult[key].decimals).toEqual(getResult[key].decimals);
    }
  }, 120_000);

  it("full POST matches prod GET — large batch", async () => {
    const [local, prod] = await Promise.all([
      localPostCurrent(LARGE_COIN_SET),
      prodGet(`/prices/current/${LARGE_COIN_SET.join(",")}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "postCurrent/large");
    expect(Object.keys(local.coins).length).toBeGreaterThan(15);
  }, 60_000);

  it("chunked POST (batches of 3) matches single POST — local", async () => {
    const chunks_ = chunk(LARGE_COIN_SET, 3);
    const [fullResult, ...chunkResults] = await Promise.all([
      localPostCurrent(LARGE_COIN_SET).then((r) => r.coins),
      ...chunks_.map((c) => localPostCurrent(c).then((r) => r.coins)),
    ]);
    const mergedChunks: Record<string, any> = {};
    for (const r of chunkResults) for (const [k, v] of Object.entries(r)) mergedChunks[k] = v;
    const fullKeys = Object.keys(fullResult).sort();
    const commonKeys = fullKeys.filter((k) => Object.keys(mergedChunks).includes(k));
    expect(commonKeys.length).toBeGreaterThan(10);
    for (const key of commonKeys) {
      expectPriceClose(fullResult[key].price, mergedChunks[key].price, `fullPOST vs chunkPOST ${key}`);
    }
  }, 120_000);

  it("POST with duplicates returns same as without — local", async () => {
    const duped = [...LARGE_COIN_SET, ...LARGE_COIN_SET.slice(0, 10)];
    const [noDupe, withDupe] = await Promise.all([
      localPostCurrent(LARGE_COIN_SET).then((r) => r.coins),
      localPostCurrent(duped).then((r) => r.coins),
    ]);
    expect(Object.keys(noDupe).sort()).toEqual(Object.keys(withDupe).sort());
  }, 60_000);

  it("POST empty array returns empty — local", async () => {
    const local = await localPostCurrent([]);
    expect(local.coins).toEqual({});
  }, 15_000);

  it("POST matches prod GET for standard coins", async () => {
    const [local, prod] = await Promise.all([
      localPostCurrent(STANDARD_COINS),
      prodGet(`/prices/current/${STANDARD_COINS.join(",")}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "postCurrent/standard");
  }, 30_000);

  it("POST matches prod GET for redirect coins", async () => {
    const [local, prod] = await Promise.all([
      localPostCurrent(REDIRECT_COINS),
      prodGet(`/prices/current/${REDIRECT_COINS.join(",")}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "postCurrent/redirects");
  }, 30_000);

  it("POST matches prod GET for case-sensitive solana coins", async () => {
    const [local, prod] = await Promise.all([
      localPostCurrent(CASE_SENSITIVE_COINS),
      prodGet(`/prices/current/${CASE_SENSITIVE_COINS.join(",")}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "postCurrent/solana");
  }, 30_000);

  it("POST invalid coins returns empty — matches prod GET", async () => {
    const [local, prod] = await Promise.all([
      localPostCurrent(INVALID_COINS),
      prodGet(`/prices/current/${INVALID_COINS.join(",")}`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 15_000);

  it("POST mixed valid + invalid matches prod GET", async () => {
    const mixed = [...STANDARD_COINS, ...INVALID_COINS];
    const [local, prod] = await Promise.all([
      localPostCurrent(mixed),
      prodGet(`/prices/current/${mixed.join(",")}?searchWidth=12h`),
    ]);
    compareFlatCoins(local.coins, prod.coins, "postCurrent/mixed");
  }, 30_000);
});

// ══════════════════════════════════════════════
// POST /pro/prices/historical — chunked comparison
// (big list POST vs chunked GET batchHistorical)
// ══════════════════════════════════════════════

describe("POST /pro/prices/historical — big list vs chunked GET", () => {
  const HIST_TIMESTAMPS = [TS_JUL_2022, TS_JAN_2023, TS_JUL_2023, TS_JAN_2024];

  async function localChunkedGetHistorical(coins: string[], timestamps: number[], chunkSize: number): Promise<Record<string, any>> {
    const chunks_ = chunk(coins, chunkSize);
    const results = await Promise.all(
      chunks_.map((c) => localGetBatchHistorical(buildCoinsObj(c, timestamps), "12h").then((r) => r.coins)),
    );
    const merged: Record<string, any> = {};
    for (const r of results) for (const [k, v] of Object.entries(r)) merged[k] = v;
    return merged;
  }

  it("full POST matches chunked GET batchHistorical — local", async () => {
    const coinsObj = buildCoinsObj(LARGE_COIN_SET, HIST_TIMESTAMPS);
    const [postResult, getResult] = await Promise.all([
      localPostHistorical(coinsObj).then((r) => r.coins),
      localChunkedGetHistorical(LARGE_COIN_SET, HIST_TIMESTAMPS, 5),
    ]);
    const postKeys = Object.keys(postResult).sort();
    const getKeys = Object.keys(getResult).sort();
    expect(postKeys.length).toBeGreaterThan(5);
    const commonKeys = postKeys.filter((k) => getKeys.includes(k));
    expect(commonKeys.length).toBeGreaterThan(5);
    for (const key of commonKeys) {
      expect(postResult[key].symbol).toEqual(getResult[key].symbol);
      const sortByTs = (a: any, b: any) => a.timestamp - b.timestamp;
      const lp = [...postResult[key].prices].sort(sortByTs);
      const gp = [...getResult[key].prices].sort(sortByTs);
      const minLen = Math.min(lp.length, gp.length);
      expect(Math.abs(lp.length - gp.length)).toBeLessThanOrEqual(1);
      for (let i = 0; i < minLen; i++) {
        expectPriceClose(lp[i].price, gp[i].price, `POSThist vs GETchunk ${key}[${i}]`);
      }
    }
  }, 180_000);

  it("full POST matches prod GET batchHistorical — large batch", async () => {
    const coinsObj = buildCoinsObj(LARGE_COIN_SET, HIST_TIMESTAMPS);
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "postHist/large");
  }, 180_000);

  it("chunked POST (batches of 5) matches single POST — local", async () => {
    const chunks_ = chunk(LARGE_COIN_SET, 5);
    const fullCoinsObj = buildCoinsObj(LARGE_COIN_SET, HIST_TIMESTAMPS);
    const [fullResult, ...chunkResults] = await Promise.all([
      localPostHistorical(fullCoinsObj).then((r) => r.coins),
      ...chunks_.map((c) => localPostHistorical(buildCoinsObj(c, HIST_TIMESTAMPS)).then((r) => r.coins)),
    ]);
    const mergedChunks: Record<string, any> = {};
    for (const r of chunkResults) for (const [k, v] of Object.entries(r)) mergedChunks[k] = v;
    const fullKeys = Object.keys(fullResult).sort();
    const commonKeys = fullKeys.filter((k) => Object.keys(mergedChunks).includes(k));
    expect(commonKeys.length).toBeGreaterThan(5);
    for (const key of commonKeys) {
      const sortByTs = (a: any, b: any) => a.timestamp - b.timestamp;
      const fp = [...fullResult[key].prices].sort(sortByTs);
      const cp = [...mergedChunks[key].prices].sort(sortByTs);
      const minLen = Math.min(fp.length, cp.length);
      for (let i = 0; i < minLen; i++) {
        expectPriceClose(fp[i].price, cp[i].price, `fullPOSThist vs chunkPOST ${key}[${i}]`);
      }
    }
  }, 180_000);

  it("POST with 6 timestamps per coin — local", async () => {
    const manyTs = [TS_JAN_2021, TS_JUL_2022, TS_AUG_2022, TS_JAN_2023, TS_JUL_2023, TS_JAN_2024];
    const coins = [CG_ETH, CG_BTC, CG_SOL, ETHEREUM_USDC, ETHEREUM_WETH];
    const result = await localPostHistorical(buildCoinsObj(coins, manyTs));
    expect(Object.keys(result.coins).length).toBeGreaterThan(2);
    for (const key of Object.keys(result.coins)) {
      expect(result.coins[key].prices.length).toBeGreaterThanOrEqual(3);
      for (const p of result.coins[key].prices) expect(p.price).toBeGreaterThan(0);
    }
  }, 120_000);

  it("POST with different timestamps per coin matches prod GET", async () => {
    const coinsObj = {
      [CG_ETH]: [TS_JUL_2022, TS_JAN_2023, TS_JAN_2024],
      [CG_BTC]: [TS_JAN_2023],
      [ETHEREUM_USDC]: [TS_JUL_2022, TS_JUL_2023],
    };
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "postHist/diffTs");
  }, 60_000);

  it("POST matches prod GET for standard coins", async () => {
    const coinsObj = buildCoinsObj(STANDARD_COINS, HIST_TIMESTAMPS);
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "postHist/standard");
  }, 60_000);

  it("POST matches prod GET for redirect coins", async () => {
    const coinsObj = buildCoinsObj(REDIRECT_COINS, HIST_TIMESTAMPS);
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "postHist/redirects");
  }, 60_000);

  it("POST matches prod GET for case-sensitive solana coins", async () => {
    const coinsObj = buildCoinsObj(CASE_SENSITIVE_COINS, [TS_JAN_2024]);
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "postHist/solana");
  }, 30_000);

  it("POST with invalid coins returns empty — matches prod GET", async () => {
    const coinsObj = buildCoinsObj(INVALID_COINS, HIST_TIMESTAMPS);
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 30_000);

  it("POST with very old timestamps returns empty — matches prod GET", async () => {
    const coinsObj = buildCoinsObj(STANDARD_COINS, [TS_VERY_OLD]);
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    expect(Object.keys(local.coins).length).toBe(0);
    expect(Object.keys(prod.coins).length).toBe(0);
  }, 30_000);

  it("POST empty object returns empty — local", async () => {
    const local = await localPostHistorical({});
    expect(local.coins).toEqual({});
  }, 15_000);

  it("POST stablecoin prices are ~$1 across all timestamps — local", async () => {
    const coinsObj = buildCoinsObj(STABLECOIN_SET, [TS_JUL_2022, TS_JAN_2023, TS_JAN_2024]);
    const result = await localPostHistorical(coinsObj);
    for (const key of Object.keys(result.coins)) {
      for (const p of result.coins[key].prices) {
        expectPriceClose(p.price, 1.0, `stablecoin hist ${key} ts=${p.timestamp}`);
      }
    }
  }, 60_000);

  it("POST ETH price sanity across dates — local", async () => {
    const coinsObj = { [CG_ETH]: [TS_JAN_2021, TS_JUL_2022, TS_JAN_2024] };
    const result = await localPostHistorical(coinsObj);
    const ethData = Object.values(result.coins)[0] as any;
    for (const p of ethData.prices) {
      expect(p.price).toBeGreaterThan(100);
      expect(p.price).toBeLessThan(5000);
    }
  }, 30_000);

  it("POST mixed case addresses match prod GET", async () => {
    const coinsObj = buildCoinsObj(MIXED_CASE_COINS, HIST_TIMESTAMPS);
    const [local, prod] = await Promise.all([
      localPostHistorical(coinsObj),
      prodGet(`/batchHistorical?coins=${encodeURIComponent(JSON.stringify(coinsObj))}&searchWidth=12h`),
    ]);
    compareHistoricalCoins(local.coins, prod.coins, "postHist/mixedcase");
  }, 60_000);
});
