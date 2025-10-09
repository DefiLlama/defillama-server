import { Chain } from "@defillama/sdk/build/general";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList, getTokenAndRedirectData } from "../../utils/database";
import type { Write } from "../../utils/dbInterfaces";


const ADAPTER = "suzaku";
const CHAIN: Chain = "avax";

const SUZ_ADDR    = "0x451532F1C9eb7E4Dc2d493dB52b682C0Acf6F5EF";
const WAVAX_ADDR  = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const USDC_ADDR   = "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e";
const SUZ_WAVAX_POOL_ADDR   = "0x59fAF1480cB7CD749ee517C2aA7a15a26C0fb9aF";
const SUZ_USDC_POOL_ADDR    = "0x03eB46B34129a77Ac7a115e87Da19Ae91D66019c";

const ERC20_SYMBOL   = "string:symbol";
const ERC20_DECIMALS = "uint8:decimals";

const UNI_V2_TOKEN0   = "address:token0";
const UNI_V2_TOKEN1   = "address:token1";
const UNI_V2_RESERVES = "function getReserves() view returns (uint112,uint112,uint32)";

const MIN_CONF_LIQ_USD = 50_000;

function confidenceFromLiquidity(usd: number) {
  if (usd >= 500_000) return 0.9;
  if (usd >= 250_000) return 0.7;
  if (usd >= 100_000) return 0.6;
  if (usd >=  50_000) return 0.5;
  return 0.3;
}

function unwrap(v: any) {
  return v && typeof v === "object" && "output" in v ? v.output : v;
}

interface PoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: number;
  reserve1: number;
}

async function getPoolData(api: any, poolAddress: string): Promise<PoolData> {
  const [t0rRaw, t1rRaw, reservesRaw] = await Promise.all([
    api.call({ abi: UNI_V2_TOKEN0,   target: poolAddress, permitFailure: true }),
    api.call({ abi: UNI_V2_TOKEN1,   target: poolAddress, permitFailure: true }),
    api.call({ abi: UNI_V2_RESERVES, target: poolAddress, permitFailure: true }),
  ]);

  const token0 = String(unwrap(t0rRaw) ?? "").toLowerCase();
  const token1 = String(unwrap(t1rRaw) ?? "").toLowerCase();
  const r      = unwrap(reservesRaw);

  let reserve0 = 0, reserve1 = 0;
  if (r == null) {
    reserve0 = 0; reserve1 = 0;
  } else if (Array.isArray(r)) {
    reserve0 = Number(r[0] ?? 0);
    reserve1 = Number(r[1] ?? 0);
  } else if (typeof r === "object") {
    reserve0 = Number((r as any)._reserve0 ?? (r as any)[0] ?? 0);
    reserve1 = Number((r as any)._reserve1 ?? (r as any)[1] ?? 0);
  } else {
    reserve0 = Number(r) || 0;
    reserve1 = 0;
  }

  return { poolAddress, token0, token1, reserve0, reserve1 };
}

async function getTokenPrices(timestamp: number = 0): Promise<Write[]> {
  const writes: Write[] = [];
  const api = await getApi(CHAIN, timestamp);

  const [sSym, sDec] = await Promise.all([
    api.call({ abi: ERC20_SYMBOL,   target: SUZ_ADDR,  permitFailure: true }),
    api.call({ abi: ERC20_DECIMALS, target: SUZ_ADDR,  permitFailure: true }),
  ]).then((r: any[]) => [r?.[0]?.output ?? "SUZ", Number(r?.[1]?.output ?? 18)]);

  const suzSymbol   = sSym || "SUZ";
  const suzDecimals = Number.isFinite(sDec) ? Number(sDec) : 18;

  const [wavaxPool, usdcPool] = await Promise.all([
    getPoolData(api, SUZ_WAVAX_POOL_ADDR),
    getPoolData(api, SUZ_USDC_POOL_ADDR),
  ]);

  const suzAddrL = SUZ_ADDR.toLowerCase();

  if (wavaxPool.token0 !== suzAddrL && wavaxPool.token1 !== suzAddrL)
    throw new Error("WAVAX pool does not contain SUZ");
  if (usdcPool.token0 !== suzAddrL && usdcPool.token1 !== suzAddrL)
    throw new Error("USDC pool does not contain SUZ");

  const wavaxSuzIsToken0 = wavaxPool.token0 === suzAddrL;
  const wavaxCounterpart = wavaxSuzIsToken0 ? wavaxPool.token1 : wavaxPool.token0;
  const wavaxSuzReserveRaw = wavaxSuzIsToken0 ? wavaxPool.reserve0 : wavaxPool.reserve1;
  const wavaxCpReserveRaw  = wavaxSuzIsToken0 ? wavaxPool.reserve1 : wavaxPool.reserve0;

  const usdcSuzIsToken0 = usdcPool.token0 === suzAddrL;
  const usdcCounterpart = usdcSuzIsToken0 ? usdcPool.token1 : usdcPool.token0;
  const usdcSuzReserveRaw = usdcSuzIsToken0 ? usdcPool.reserve0 : usdcPool.reserve1;
  const usdcCpReserveRaw  = usdcSuzIsToken0 ? usdcPool.reserve1 : usdcPool.reserve0;

  let wavaxPrice = 0;
  let usdcPrice = 0;

  if (!process.env.LOCAL_TEST) {
    try {
      const [wavaxInfo, usdcInfo] = await getTokenAndRedirectData(
        [`${CHAIN}:${wavaxCounterpart}`, `${CHAIN}:${usdcCounterpart}`],
        CHAIN,
        timestamp
      );
      wavaxPrice = Number(wavaxInfo?.price ?? 0);
      usdcPrice = Number(usdcInfo?.price ?? 0);
    } catch (e) {
      throw e;
    }
  }

  const [wavaxDecimals, usdcDecimals] = await Promise.all([
    api.call({ abi: ERC20_DECIMALS, target: wavaxCounterpart, permitFailure: true }),
    api.call({ abi: ERC20_DECIMALS, target: usdcCounterpart, permitFailure: true }),
  ]).then((r: any[]) => [
    Number(unwrap(r[0]) ?? 18) || 18,
    Number(unwrap(r[1]) ?? 6) || 6,
  ]);

  if (!wavaxPrice && process.env.LOCAL_TEST && wavaxCounterpart === WAVAX_ADDR.toLowerCase()) {
    wavaxPrice = 28.44;
    console.log("🧪 Using LOCAL_TEST fallback price for WAVAX:", wavaxPrice);
  }
  if (!usdcPrice && process.env.LOCAL_TEST && usdcCounterpart === USDC_ADDR.toLowerCase()) {
    usdcPrice = 1.0;
    console.log("🧪 Using LOCAL_TEST fallback price for USDC:", usdcPrice);
  }

  if (!wavaxPrice) throw new Error("No WAVAX price from Llama DB");
  if (!usdcPrice) throw new Error("No USDC price from Llama DB");

  const wavaxSuzAmount = wavaxSuzReserveRaw ? Number(wavaxSuzReserveRaw) / (10 ** suzDecimals) : 0;
  const wavaxCpAmount  = wavaxCpReserveRaw  ? Number(wavaxCpReserveRaw)  / (10 ** wavaxDecimals) : 0;

  const usdcSuzAmount = usdcSuzReserveRaw ? Number(usdcSuzReserveRaw) / (10 ** suzDecimals) : 0;
  const usdcCpAmount  = usdcCpReserveRaw  ? Number(usdcCpReserveRaw)  / (10 ** usdcDecimals)  : 0;

  const suzPriceFromWavax = wavaxSuzAmount > 0 ? (wavaxCpAmount / wavaxSuzAmount) * wavaxPrice : 0;
  const suzPriceFromUsdc  = usdcSuzAmount > 0 ? (usdcCpAmount / usdcSuzAmount) * usdcPrice : 0;

  const wavaxLiquidityUsd = wavaxCpAmount * wavaxPrice;
  const usdcLiquidityUsd  = usdcCpAmount * usdcPrice;
  const totalLiquidityUsd = wavaxLiquidityUsd + usdcLiquidityUsd;

  let suzPriceUsd: number;
  if (totalLiquidityUsd > 0) {
    suzPriceUsd = (
      (suzPriceFromWavax * wavaxLiquidityUsd + suzPriceFromUsdc * usdcLiquidityUsd) /
      totalLiquidityUsd
    );
  } else {
    suzPriceUsd = suzPriceFromWavax || suzPriceFromUsdc || 0;
  }

  const confidence = confidenceFromLiquidity(totalLiquidityUsd);

  addToDBWritesList(
    writes,
    CHAIN,
    SUZ_ADDR,
    suzPriceUsd,
    suzDecimals,
    suzSymbol,
    timestamp,
    ADAPTER,
    confidence
  );

  // Dev log
  if (process.env.LOCAL_TEST) {
    console.log("Pool liquidity breakdown:");
    console.log(`  WAVAX pool: $${wavaxLiquidityUsd.toFixed(2)} (SUZ price: $${suzPriceFromWavax.toFixed(6)})`);
    console.log(`  USDC pool:  $${usdcLiquidityUsd.toFixed(2)} (SUZ price: $${suzPriceFromUsdc.toFixed(6)})`);
    console.log(`  Total:      $${totalLiquidityUsd.toFixed(2)}`);
    console.log(`  Weighted SUZ price: $${suzPriceUsd.toFixed(6)}`);
    console.log(`  Confidence: ${confidence}`);
    console.log("\nSuzaku coin adapter writes:", JSON.stringify(writes, null, 2));
  }

  return writes;
}


async function suzaku(timestamp: number = 0) {
  try {
    return await getTokenPrices(timestamp);
  } catch (e) {
    if (process.env.LOCAL_TEST) console.error("suzaku adapter error:", e);
    return [];
  }
}

module.exports = suzaku;
