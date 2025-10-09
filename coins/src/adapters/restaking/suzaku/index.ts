import { Chain } from "@defillama/sdk/build/general";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList, getTokenAndRedirectData } from "../../utils/database";
import type { Write } from "../../utils/dbInterfaces";


const ADAPTER = "suzaku";
const CHAIN: Chain = "avax";

const SUZ_ADDR    = "0x451532F1C9eb7E4Dc2d493dB52b682C0Acf6F5EF";
const WAVAX_ADDR  = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const POOL_ADDR   = "0x59fAF1480cB7CD749ee517C2aA7a15a26C0fb9aF";

const ERC20_SYMBOL   = "string:symbol";
const ERC20_DECIMALS = "uint8:decimals";

const UNI_V2_TOKEN0   = "address:token0";
const UNI_V2_TOKEN1   = "address:token1";
const UNI_V2_RESERVES = "function getReserves() view returns (uint112,uint112,uint32)";

const MIN_CONF_LIQ_USD = 10_000;

function confidenceFromLiquidity(usd: number) {
  if (usd > 1_000_000) return 0.9;
  if (usd >   200_000) return 0.7;
  if (usd >    50_000) return 0.6;
  if (usd >    10_000) return 0.5;
  return 0.3;
}

function unwrap(v: any) {
  return v && typeof v === "object" && "output" in v ? v.output : v;
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

  const [t0rRaw, t1rRaw, reservesRaw] = await Promise.all([
    api.call({ abi: UNI_V2_TOKEN0,   target: POOL_ADDR, permitFailure: true }),
    api.call({ abi: UNI_V2_TOKEN1,   target: POOL_ADDR, permitFailure: true }),
    api.call({ abi: UNI_V2_RESERVES, target: POOL_ADDR, permitFailure: true }),
  ]);

  const token0 = String(unwrap(t0rRaw) ?? "").toLowerCase();
  const token1 = String(unwrap(t1rRaw) ?? "").toLowerCase();
  const r      = unwrap(reservesRaw);

  const suzAddrL = SUZ_ADDR.toLowerCase();
  if (token0 !== suzAddrL && token1 !== suzAddrL)
    throw new Error("Pool does not contain SUZ");

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

  const suzIsToken0   = token0 === suzAddrL;
  const counterpart   = suzIsToken0 ? token1 : token0;
  const suzReserveRaw = suzIsToken0 ? reserve0 : reserve1;
  const cpReserveRaw  = suzIsToken0 ? reserve1 : reserve0;

  let cpPrice = 0;

  if (!process.env.LOCAL_TEST || counterpart !== WAVAX_ADDR.toLowerCase()) {
    try {
      const [cpInfo] = await getTokenAndRedirectData([`${CHAIN}:${counterpart}`], CHAIN, timestamp);
      cpPrice = Number(cpInfo?.price ?? 0);
    } catch (e) {
      if (!process.env.LOCAL_TEST) throw e;
    }
  }

  const cpDecimals = Number(
    unwrap(await api.call({ abi: ERC20_DECIMALS, target: counterpart, permitFailure: true })) ?? 18
  ) || 18;

  if (!cpPrice && process.env.LOCAL_TEST && counterpart === WAVAX_ADDR.toLowerCase()) {
    cpPrice = 28.44;
    console.log("🧪 Using LOCAL_TEST fallback price for WAVAX:", cpPrice);
  }
  if (!cpPrice) throw new Error("No counterpart price from Llama DB");

  const suzAmount = suzReserveRaw ? Number(suzReserveRaw) / (10 ** suzDecimals) : 0;
  const cpAmount  = cpReserveRaw  ? Number(cpReserveRaw)  / (10 ** cpDecimals)  : 0;

  const suzPriceUsd = suzAmount > 0 ? (cpAmount / suzAmount) * cpPrice : 0;

  const cpReserveUsd = cpAmount * cpPrice;
  const confidence   = Math.min(confidenceFromLiquidity(cpReserveUsd), 0.95);

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
    console.log("Suzaku coin adapter writes:", JSON.stringify(writes, null, 2));
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
