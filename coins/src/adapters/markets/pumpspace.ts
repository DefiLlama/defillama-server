import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { getApi } from "../utils/sdk";
import { Write } from "../utils/dbInterfaces";

const CHAIN = "avax";
const PROJECT = "pumpspace";

// bUSDt (already mapped as stable on DefiLlama)
const BUSDt = "0x3C594084dC7AB1864AC69DFd01AB77E8f65B83B7".toLowerCase();

/**
 * We price PumpSpace tokens from explicit UniswapV2 pairs against bUSDt.
 * These pair addresses are on Avalanche.
 *
 * Pairs provided by PumpSpace team:
 * - bUSDt + KRILL : 0x7EFbB1B0a4dDF0FC82A2Ca9EFFf45104090BC7D4
 * - bUSDt + sBWPM : 0x083Fa2AcD819dd33B57cB918A4f47c14668fdCD2
 * - bUSDt + sADOL : 0xb568658A197A6a3436CFe1a9e6A137890c7b2840
 * - CLAM + bUSDt  : 0xC573C783270057cB420a4Ba2523dB70E7D385Ff0
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

/**
 * Safely convert a big integer-like (string/BN/etc) into a JS number in "human units",
 * without relying on bigint literals.
 * We truncate fractional digits to avoid huge float parsing.
 */
function formatUnitsToNumber(raw: any, decimals: number, fracDigits = 12): number {
  if (raw === null || raw === undefined) return 0;

  const s0 = raw.toString();
  if (!s0 || s0 === "0") return 0;

  // Remove any non-digit prefix (just in case)
  const negative = s0.startsWith("-");
  const s = negative ? s0.slice(1) : s0;

  if (decimals <= 0) return (negative ? -1 : 1) * Number(s);

  const len = s.length;
  const intPart = len > decimals ? s.slice(0, len - decimals) : "0";
  let fracPart = len > decimals ? s.slice(len - decimals) : s.padStart(decimals, "0");

  // Truncate fractional part for stable float parse
  fracPart = fracPart.slice(0, Math.max(0, fracDigits));

  const out = Number(`${negative ? "-" : ""}${intPart}.${fracPart || "0"}`);
  return Number.isFinite(out) ? out : 0;
}

function confidenceFromLiquidityUsd(liqUsd: number): number {
  if (!Number.isFinite(liqUsd) || liqUsd <= 0) return 0.35;
  // Scale: ~0.6 at $1k, ~0.9 at $1m, capped
  const c = 0.3 + Math.log10(liqUsd + 1) / 10;
  return Math.max(0.3, Math.min(0.95, c));
}

async function getPrices(timestamp: number): Promise<Write[]> {
  const api = await getApi(CHAIN, timestamp, true);

  // Pull bUSDt price from DB (should be ~1 due to mapping)
  const busdtData = (await getTokenAndRedirectData([BUSDt], CHAIN, timestamp))?.[0];
  const busdtPrice = busdtData?.price ?? 1;

  // We still fetch onchain decimals to avoid relying on DB metadata
  let busdtDecimals = 18;
  try {
    busdtDecimals = Number(await api.call({ target: BUSDt, abi: "erc20:decimals" }));
  } catch {}

  const pairAddrs = PAIRS.map((p) => p.pair);
  const tokenAddrs = PAIRS.map((p) => p.token);

  const [token0s, token1s, reserves, tokenDecimals] = await Promise.all([
    api.multiCall({ abi: "address:token0", calls: pairAddrs, permitFailure: true }),
    api.multiCall({ abi: "address:token1", calls: pairAddrs, permitFailure: true }),
    api.multiCall({
      abi: "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
      calls: pairAddrs,
      permitFailure: true,
    }),
    api.multiCall({ abi: "erc20:decimals", calls: tokenAddrs, permitFailure: true }),
  ]);

  const writes: Write[] = [];

  for (let i = 0; i < PAIRS.length; i++) {
    const expectedToken = PAIRS[i].token.toLowerCase();
    const symbol = PAIRS[i].symbol;

    const t0 = (token0s?.[i] ?? "").toString().toLowerCase();
    const t1 = (token1s?.[i] ?? "").toString().toLowerCase();
    if (!t0 || !t1) continue;

    const r = reserves?.[i];
    if (!r) continue;

    // Handle tuple/object formats
    const reserve0 = Array.isArray(r) ? r[0] : (r as any).reserve0 ?? (r as any)[0];
    const reserve1 = Array.isArray(r) ? r[1] : (r as any).reserve1 ?? (r as any)[1];
    if (reserve0 === undefined || reserve1 === undefined) continue;

    const tokenDec = Number(tokenDecimals?.[i] ?? 18);

    // Determine which side is bUSDt
    let busdtReserveRaw: any = null;
    let tokenReserveRaw: any = null;
    let tokenAddr: string | null = null;

    if (t0 === BUSDt && t1 === expectedToken) {
      busdtReserveRaw = reserve0;
      tokenReserveRaw = reserve1;
      tokenAddr = expectedToken;
    } else if (t1 === BUSDt && t0 === expectedToken) {
      busdtReserveRaw = reserve1;
      tokenReserveRaw = reserve0;
      tokenAddr = expectedToken;
    } else {
      // Pair is not (bUSDt, expectedToken) – skip for safety
      continue;
    }

    const busdtAmt = formatUnitsToNumber(busdtReserveRaw, busdtDecimals) * busdtPrice; // USD
    const tokenAmt = formatUnitsToNumber(tokenReserveRaw, tokenDec);

    if (busdtAmt <= 0 || tokenAmt <= 0) continue;

    const price = busdtAmt / tokenAmt;

    // Use ~2x quote side as a rough liquidity proxy
    const liquidityUsd = busdtAmt * 2;
    const confidence = confidenceFromLiquidityUsd(liquidityUsd);

    console.log(symbol, ' : ', price);

    addToDBWritesList(
      writes,
      CHAIN,
      tokenAddr!,
      price,
      tokenDec,
      symbol,
      timestamp,
      PROJECT,
      confidence
    );
  }

  return writes;
}

export async function pumpspace(timestamp: number): Promise<Write[][]> {
  const ts = timestamp === 0 ? getCurrentUnixTimestamp() : timestamp;
  return [await getPrices(ts)];
}