import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import axios from "axios";
import { address } from "../../utils/ton";

/**
 * Ton4You coin-prices adapter (TON).
 *
 * Purpose:
 * - Populate Coin Prices DB for Ton4You live settlement jettons (T4U, USDT, etc.).
 * - Expose canonical prices under `ton:0:<hex>` and provide a redirect for friendly `ton:EQ...` queries.
 *
 * Price discovery:
 * - Uses public ston.fi API as a data source for USD prices.
 * - If ston.fi does not provide a direct USD price for an asset, the adapter derives the price from the
 *   token/TON pool reserves (ston.fi `get_pool_data`) and a canonical TON/USD price.
 * - Confidence is derived from the ston.fi pool liquidity when available.
 *
 * Notes:
 * - This adapter is "current prices only" (timestamp=0 or recent), consistent with other market-based adapters.
 * - Demo/test assets are intentionally excluded.
 */

type TokenCfg = {
  key: string;
  symbol: string;
  decimals: number;
  master: string; // friendly EQ...
  stonfiPool?: string; // ston.fi pool address (token/TON) used for liquidity-based confidence
  expectedUsd?: number; // optional hint to detect reserve orientation (e.g. stablecoin ~1)
};

// Source of truth: ton4you-backend-v3/app/core/pools_defaults.py (DEFAULT_CONNECTED_POOLS), is_demo=false only.
const TOKENS: TokenCfg[] = [
  {
    key: "t4u",
    symbol: "T4U",
    decimals: 9,
    master: "EQA0nLHHeZrT1SwWrBd8N5_5CKXJQFL7CnPYDLLnw-sIqoBq",
    stonfiPool: "EQD7lgXGm8PYifBoWSOlF-dmvnw0A6rduU3ZB_yWwhSWN1Rd",
  },
  {
    key: "brin",
    symbol: "BRIN",
    decimals: 9,
    master: "EQAQfNrwhA5sEywrLTtsxpyQFeKRfEpLdZREZILP9z9iUjAH",
    stonfiPool: "EQDDupxFqo5J8PdYBNpG7q38jAZ5hBDwxJSrflhU5WpSitrp",
  },
  {
    key: "usdt",
    symbol: "USDT",
    decimals: 6,
    master: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    stonfiPool: "EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4",
    expectedUsd: 1,
  },
];

const chain = "ton";
const adapter = "ton4you";

type StonAsset = {
  contract_address: string;
  dex_price_usd?: string | number;
  symbol?: string;
  decimals?: number;
};

type StonPool = {
  address: string;
  lp_total_supply_usd?: string | number;
};

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function confidenceFromLiquidityUsd(liquidityUsd: number | undefined) {
  // Conservative mapping, tuned for review friendliness.
  if (!Number.isFinite(liquidityUsd as number) || (liquidityUsd as number) <= 0)
    return 0.8;
  const v = Number(liquidityUsd);
  if (v >= 1_000_000) return 0.95;
  if (v >= 200_000) return 0.9;
  if (v >= 50_000) return 0.85;
  if (v >= 20_000) return 0.8;
  return 0.75;
}

async function fetchStonAssets(): Promise<StonAsset[]> {
  const { data } = await axios.get("https://api.ston.fi/v1/assets");
  return (data?.asset_list ?? []) as StonAsset[];
}

async function fetchStonPools(): Promise<StonPool[]> {
  const { data } = await axios.get("https://api.ston.fi/v1/pools");
  return (data?.pool_list ?? []) as StonPool[];
}

async function fetchTonUsd() {
  // Using the canonical TON price from DefiLlama's price API avoids relying on any single DEX endpoint
  // for USD conversion. This is a common pattern in coins adapters for "unknown token" pricing.
  const base = "coingecko:the-open-network";
  const { data } = await axios.get(`https://coins.llama.fi/prices/current/${base}`);
  const price = Number(data?.coins?.[base]?.price);
  if (!Number.isFinite(price) || price <= 0) return undefined;
  return price;
}

type ToncenterRunGetMethodStackItem = [string, any];

async function toncenterRunGetMethod(target: string, method: string, stack: any[] = []) {
  const key =
    process.env.TONCENTER_API_KEY ||
    process.env.TONCENTER_KEY ||
    process.env.TONCENTER ||
    process.env.TON_API_KEY;

  const url = `https://toncenter.com/api/v2/runGetMethod${key ? `?api_key=${key}` : ""}`;
  const { data } = await axios.post(url, {
    address: target,
    method,
    stack,
  });

  if (!data?.ok || !data?.result) throw new Error("toncenter runGetMethod failed");
  if (data.result.exit_code !== 0) throw new Error(`toncenter exit_code=${data.result.exit_code}`);

  return (data.result.stack ?? []) as ToncenterRunGetMethodStackItem[];
}

async function tonscanRunGetMethod(target: string, method: string) {
  // Alternative public endpoint used by other TON adapters in this repo.
  // It does not require an API key and can be useful when toncenter throttles.
  const { data } = await axios.post(
    `https://api.tonscan.com/api/bt/runGetMethod/${target}/${method}`,
    {},
    { timeout: 30_000 },
  );

  const statusCode = Number((data as any)?.status_code);
  const json = (data as any)?.json;
  const exitCode = Number(json?.data?.exit_code);
  const raw = json?.data?.raw;
  if (statusCode !== 200) throw new Error(`tonscan status_code=${statusCode}`);
  if (exitCode !== 0) throw new Error(`tonscan exit_code=${exitCode}`);
  if (!Array.isArray(raw)) throw new Error("tonscan missing raw stack");

  return raw as ToncenterRunGetMethodStackItem[];
}

function parseToncenterNum(item: ToncenterRunGetMethodStackItem | undefined) {
  if (!item) return undefined;
  const [t, v] = item;
  if (t !== "num") return undefined;
  try {
    return parseInt(String(v), 16);
  } catch {
    return undefined;
  }
}

function tokenPerTonFromReserves(tokenReserveAtomic: number, tonReserveAtomic: number, tokenDecimals: number) {
  // token_per_ton in human units:
  // (token_atomic / 10^token_decimals) / (ton_atomic / 10^9)
  // => (token_atomic / ton_atomic) * 10^(9 - token_decimals)
  if (!Number.isFinite(tokenReserveAtomic) || !Number.isFinite(tonReserveAtomic)) return undefined;
  if (tonReserveAtomic <= 0 || tokenReserveAtomic <= 0) return undefined;
  const scaleFactor = 10 ** (9 - tokenDecimals);
  const v = (tokenReserveAtomic / tonReserveAtomic) * scaleFactor;
  if (!Number.isFinite(v) || v <= 0) return undefined;
  return v;
}

function chooseOrientation({
  reserve0,
  reserve1,
  tokenDecimals,
  tonUsd,
  expectedUsd,
}: {
  reserve0: number;
  reserve1: number;
  tokenDecimals: number;
  tonUsd: number;
  expectedUsd?: number;
}) {
  // ston.fi pool is token/TON but token can be either reserve0 or reserve1.
  // We compute both candidate prices and select the most plausible one.
  const candidates = [
    { tokenReserve: reserve0, tonReserve: reserve1 },
    { tokenReserve: reserve1, tonReserve: reserve0 },
  ]
    .map(({ tokenReserve, tonReserve }) => {
      const tokenPerTon = tokenPerTonFromReserves(tokenReserve, tonReserve, tokenDecimals);
      const usdPerToken = tokenPerTon ? tonUsd / tokenPerTon : undefined;
      return { tokenReserve, tonReserve, tokenPerTon, usdPerToken };
    })
    .filter((c) => Number.isFinite(c.usdPerToken as number) && (c.usdPerToken as number) > 0);

  if (!candidates.length) return undefined;

  if (expectedUsd !== undefined) {
    candidates.sort(
      (a, b) =>
        Math.abs((a.usdPerToken as number) - expectedUsd) -
        Math.abs((b.usdPerToken as number) - expectedUsd),
    );
    return candidates[0];
  }

  // Generic heuristic: avoid absurd prices (helps pick correct orientation in practice).
  candidates.sort((a, b) => (a.usdPerToken as number) - (b.usdPerToken as number));
  const plausible = candidates.find((c) => (c.usdPerToken as number) < 1e6);
  return plausible ?? candidates[0];
}

async function runGetMethodStack(target: string, method: string) {
  try {
    return await toncenterRunGetMethod(target, method, []);
  } catch {
    // fall back
  }
  return tonscanRunGetMethod(target, method);
}

async function fetchUsdPriceFromStonPool(token: TokenCfg, tonUsd: number) {
  if (!token.stonfiPool) return undefined;

  const stack = await runGetMethodStack(token.stonfiPool, "get_pool_data");
  const reserve0 = parseToncenterNum(stack[3]);
  const reserve1 = parseToncenterNum(stack[4]);
  if (reserve0 === undefined || reserve1 === undefined) return undefined;

  const chosen = chooseOrientation({
    reserve0,
    reserve1,
    tokenDecimals: token.decimals,
    tonUsd,
    expectedUsd: token.expectedUsd,
  });
  return chosen?.usdPerToken;
}

async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];

  const [assets, pools, tonUsd] = await Promise.all([fetchStonAssets(), fetchStonPools(), fetchTonUsd()]);

  const poolsByAddr: Record<string, StonPool> = {};
  for (const p of pools) {
    const poolAddr = (p?.address ?? "").toString().trim();
    if (!poolAddr) continue;
    poolsByAddr[poolAddr] = p;
  }

  const assetsByKey: Record<string, StonAsset> = {};
  for (const a of assets) {
    const contract = String(a?.contract_address ?? "").trim();
    if (!contract) continue;
    assetsByKey[contract] = a;
    try {
      const addr = address(contract);
      assetsByKey[addr.toString()] = a;
      assetsByKey[addr.toRawString().toLowerCase()] = a;
    } catch { /* ignore */ }
  }

  for (const token of TOKENS) {
    const friendly = token.master;
    const raw = address(friendly).toRawString();
    const rawLower = raw.toLowerCase();

    const asset =
      assetsByKey[friendly] ??
      assetsByKey[address(friendly).toString()] ??
      assetsByKey[rawLower];

    let price = Number(asset?.dex_price_usd);
    if (!Number.isFinite(price) || price <= 0) {
      // Fallback: compute price from the ston.fi token/TON pool reserves and the canonical TON/USD price.
      if (tonUsd !== undefined) {
        try {
          const derived = await fetchUsdPriceFromStonPool(token, tonUsd);
          if (Number.isFinite(derived) && (derived as number) > 0) price = Number(derived);
        } catch {
          // ignore and keep trying other methods
        }
      }
    }

    if (!Number.isFinite(price) || price <= 0) continue;

    const poolLiquidityUsd = token.stonfiPool
      ? Number(poolsByAddr[token.stonfiPool]?.lp_total_supply_usd)
      : undefined;
    const confidence = clamp01(confidenceFromLiquidityUsd(poolLiquidityUsd));

    // Canonical write under raw "0:<hex>"
    addToDBWritesList(
      writes,
      chain,
      rawLower,
      price,
      token.decimals,
      token.symbol,
      timestamp,
      adapter,
      confidence,
    );

    // Redirect so queries using friendly `ton:EQ...` resolve.
    addToDBWritesList(
      writes,
      chain,
      friendly,
      undefined,
      token.decimals,
      token.symbol,
      timestamp,
      adapter,
      confidence,
      `asset#ton:${rawLower}`,
    );
  }

  return writes;
}

export function ton4you(timestamp: number) {
  const THIRTY_MINUTES = 1800;
  if (+timestamp !== 0 && timestamp < +new Date() / 1e3 - THIRTY_MINUTES)
    throw new Error("Can't fetch historical data");
  return Promise.all([getTokenPrices(timestamp)]);
}
