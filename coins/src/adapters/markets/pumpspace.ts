import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { getApi } from "../utils/sdk";
import { Write } from "../utils/dbInterfaces";

const CHAIN = "avax";
const PROJECT = "pumpspace";

// bUSDt (already mapped as stable on DefiLlama)
const BUSDt = "0x3C594084dC7AB1864AC69DFd01AB77E8f65B83B7".toLowerCase();

/**
 * We price PumpSpace ecosystem tokens from explicit UniswapV2 pairs against bUSDt,
 * using on-chain reserves.
 *
 * Pairs (Avalanche):
 * - bUSDt + KRILL : 0x7EFbB1B0a4dDF0FC82A2Ca9EFFf45104090BC7D4
 * - bUSDt + sBWPM : 0x083Fa2AcD819dd33B57cB918A4f47c14668fdCD2
 * - bUSDt + sADOL : 0xb568658A197A6a3436CFe1a9e6A137890c7b2840
 * - CLAM  + bUSDt : 0xC573C783270057cB420a4Ba2523dB70E7D385Ff0
 */
const PAIRS = [
  {
    pair: "0x7EFbB1B0a4dDF0FC82A2Ca9EFFf45104090BC7D4",
    token: "0x4ED0A710a825B9FcD59384335836b18C75A34270", // KRILL
    symbol: "KRILL",
  },
  {
    pair: "0x083Fa2AcD819dd33B57cB918A4f47c14668fdCD2",
    token: "0x6c960648d5F16f9e12895C28655cc6Dd73B660f7", // sBWPM
    symbol: "sBWPM",
  },
  {
    pair: "0xb568658A197A6a3436CFe1a9e6A137890c7b2840",
    token: "0x6214D13725d458890a8EF39ECB2578BdfCd82170", // sADOL
    symbol: "sADOL",
  },
  {
    pair: "0xC573C783270057cB420a4Ba2523dB70E7D385Ff0",
    token: "0x1ea53822f9B2a860A7d20C6D2560Fd07db7CFF85", // CLAM
    symbol: "CLAM",
  },
] as const;

/** Unwrap ChainApi multiCall/call outputs if they are wrapped. */
function unwrapCallResult(v: any) {
  if (v && typeof v === "object" && "output" in v) return (v as any).output;
  return v;
}

/**
 * Convert an integer-like value (string/BN/etc.) into a JS number in human units.
 * Truncates fractional digits to keep float parsing stable.
 */
function formatUnitsToNumber(
  raw: any,
  decimals: number,
  fracDigits = 12,
): number {
  if (raw === null || raw === undefined) return 0;

  const s0 = raw.toString?.() ?? String(raw);
  if (!s0 || s0 === "0") return 0;

  const negative = s0.startsWith("-");
  const s = negative ? s0.slice(1) : s0;

  if (decimals <= 0) {
    const out = Number(`${negative ? "-" : ""}${s}`);
    return Number.isFinite(out) ? out : 0;
  }

  const len = s.length;
  const intPart = len > decimals ? s.slice(0, len - decimals) : "0";
  let fracPart =
    len > decimals ? s.slice(len - decimals) : s.padStart(decimals, "0");

  // truncate fractional part for stable parsing
  fracPart = fracPart.slice(0, Math.max(0, fracDigits));
  const out = Number(`${negative ? "-" : ""}${intPart}.${fracPart || "0"}`);
  return Number.isFinite(out) ? out : 0;
}

/** Confidence heuristic based on approximate liquidity in USD. */
function confidenceFromLiquidityUsd(liqUsd: number): number {
  if (!Number.isFinite(liqUsd) || liqUsd <= 0) return 0.35;
  // ~0.6 at $1k, ~0.9 at $1m, capped
  const c = 0.3 + Math.log10(liqUsd + 1) / 10;
  return Math.max(0.3, Math.min(0.95, c));
}

/**
 * Fetch PumpSpace token prices at the given timestamp (Avalanche).
 * Fail-closed: if required metadata is missing/invalid, skip or return empty writes.
 */
async function getPrices(readTimestamp: number, writeTimestamp: number): Promise<Write[]> {
  const api = await getApi(CHAIN, readTimestamp, true);

  // bUSDt price from DB (must exist; do NOT default to 1)
  const busdtData = (
    await getTokenAndRedirectData([BUSDt], CHAIN, readTimestamp)
  )?.[0];
  const busdtPrice = Number(busdtData?.price);

  if (!Number.isFinite(busdtPrice) || busdtPrice <= 0) {
    console.log("[pumpspace] invalid bUSDt price (fail-closed)", {
      chain: CHAIN,
      writeTimestamp,
      token: BUSDt,
      price: busdtData?.price,
    });
    return [];
  }

  // bUSDt decimals from chain (must exist; do NOT default)
  let busdtDecimals: number | null = null;
  try {
    const res = await api.call({ target: BUSDt, abi: "erc20:decimals" });
    const dec = unwrapCallResult(res);
    busdtDecimals = Number(dec?.toString?.() ?? dec);
  } catch (e: any) {
    console.log("[pumpspace] failed to fetch bUSDt decimals (fail-closed)", {
      chain: CHAIN,
      writeTimestamp,
      token: BUSDt,
      error: e?.message ?? String(e),
    });
  }

  if (
    busdtDecimals === null ||
    !Number.isInteger(busdtDecimals) ||
    busdtDecimals < 0 ||
    busdtDecimals > 255
  ) {
    console.log("[pumpspace] invalid bUSDt decimals (fail-closed)", {
      chain: CHAIN,
      writeTimestamp,
      token: BUSDt,
      decimals: busdtDecimals,
    });
    return [];
  }

  const pairAddrs = PAIRS.map((p) => p.pair);
  const tokenAddrs = PAIRS.map((p) => p.token);

  const [token0sRaw, token1sRaw, reservesRaw, tokenDecimalsRaw] =
    await Promise.all([
      api.multiCall({
        abi: "address:token0",
        calls: pairAddrs,
        permitFailure: true,
      }),
      api.multiCall({
        abi: "address:token1",
        calls: pairAddrs,
        permitFailure: true,
      }),
      api.multiCall({
        abi: "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        calls: pairAddrs,
        permitFailure: true,
      }),
      api.multiCall({
        abi: "erc20:decimals",
        calls: tokenAddrs,
        permitFailure: true,
      }),
    ]);

  const writes: Write[] = [];

  for (let i = 0; i < PAIRS.length; i++) {
    const pair = PAIRS[i].pair;
    const tokenAddress = PAIRS[i].token;
    const expectedTokenLc = tokenAddress.toLowerCase();
    const symbol = PAIRS[i].symbol;

    const t0 = (unwrapCallResult((token0sRaw as any)?.[i]) ?? "")
      .toString()
      .toLowerCase();
    const t1 = (unwrapCallResult((token1sRaw as any)?.[i]) ?? "")
      .toString()
      .toLowerCase();
    if (!t0 || !t1) {
      console.log("[pumpspace] missing token0/token1", {
        chain: CHAIN,
        writeTimestamp,
        pair,
        token: tokenAddress,
      });
      continue;
    }

    // unwrap reserves
    const rUnwrapped = unwrapCallResult((reservesRaw as any)?.[i]);
    if (!rUnwrapped) {
      console.log("[pumpspace] missing reserves", {
        chain: CHAIN,
        writeTimestamp,
        pair,
        token: tokenAddress,
      });
      continue;
    }

    // reserves can appear as array or object; support both
    let reserve0: any = null;
    let reserve1: any = null;

    if (Array.isArray(rUnwrapped)) {
      reserve0 = rUnwrapped[0];
      reserve1 = rUnwrapped[1];
    } else if (typeof rUnwrapped === "object") {
      reserve0 =
        (rUnwrapped as any).reserve0 ??
        (rUnwrapped as any)._reserve0 ??
        (rUnwrapped as any)[0];
      reserve1 =
        (rUnwrapped as any).reserve1 ??
        (rUnwrapped as any)._reserve1 ??
        (rUnwrapped as any)[1];
    }

    if (
      reserve0 === null ||
      reserve0 === undefined ||
      reserve1 === null ||
      reserve1 === undefined
    ) {
      console.log("[pumpspace] invalid reserves shape", {
        chain: CHAIN,
        writeTimestamp,
        pair,
        token: tokenAddress,
      });
      continue;
    }

    // token decimals (must exist; do NOT default to 18)
    const tokenDecRaw = unwrapCallResult((tokenDecimalsRaw as any)?.[i]);
    if (tokenDecRaw === null || tokenDecRaw === undefined) {
      console.log("[pumpspace] missing token decimals", {
        chain: CHAIN,
        writeTimestamp,
        pair,
        token: tokenAddress,
      });
      continue;
    }

    const tokenDec = Number(tokenDecRaw?.toString?.() ?? tokenDecRaw);
    if (!Number.isInteger(tokenDec) || tokenDec < 0 || tokenDec > 255) {
      console.log("[pumpspace] invalid token decimals", {
        chain: CHAIN,
        writeTimestamp,
        pair,
        token: tokenAddress,
        decimals: tokenDecRaw,
      });
      continue;
    }

    // Determine which side is bUSDt
    let busdtReserveRaw: any = null;
    let tokenReserveRaw: any = null;

    if (t0 === BUSDt && t1 === expectedTokenLc) {
      busdtReserveRaw = reserve0;
      tokenReserveRaw = reserve1;
    } else if (t1 === BUSDt && t0 === expectedTokenLc) {
      busdtReserveRaw = reserve1;
      tokenReserveRaw = reserve0;
    } else {
      // Pair not matching (bUSDt, token) - skip for safety
      console.log("[pumpspace] pair does not match expected (bUSDt, token)", {
        chain: CHAIN,
        writeTimestamp,
        pair,
        token: tokenAddress,
        token0: t0,
        token1: t1,
      });
      continue;
    }

    const busdtAmt =
      formatUnitsToNumber(busdtReserveRaw, busdtDecimals) * busdtPrice; // USD value
    const tokenAmt = formatUnitsToNumber(tokenReserveRaw, tokenDec);

    if (
      !Number.isFinite(busdtAmt) ||
      !Number.isFinite(tokenAmt) ||
      busdtAmt <= 0 ||
      tokenAmt <= 0
    ) {
      continue;
    }

    const price = busdtAmt / tokenAmt;
    if (!Number.isFinite(price) || price <= 0) continue;

    // Approx liquidity proxy: ~2x quote side
    const liquidityUsd = busdtAmt * 2;
    const confidence = confidenceFromLiquidityUsd(liquidityUsd);

    console.log(symbol + ' : ' + price);
    addToDBWritesList(
      writes,
      CHAIN,
      tokenAddress,
      price,
      tokenDec,
      symbol,
      writeTimestamp,
      PROJECT,
      confidence,
    );
  }

  return writes;
}

/** PumpSpace market adapter entry point. */
export async function pumpspace(timestamp: number): Promise<Write[][]> {
  const readTimestamp = timestamp === 0 ? getCurrentUnixTimestamp() : timestamp;
  return [await getPrices(readTimestamp, timestamp)];
}
