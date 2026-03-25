import { addToDBWritesList, getTokenAndRedirectDataMap } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import { getApi } from "../utils/sdk";

const DUSD = "0x63d74d22E689C715a04F2C13962b1f77F443d35b";
const DUSD_USDC_POOL = "0x206239406abccf730493e4b133b30df546f9ff43";
const slot0Abi =
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)";
export default async function getTokenPrices(chain: string, timestamp: number): Promise<Write[]> {
  
  const api = await getApi(chain, timestamp);

  const [token0, token1, slot0] = await Promise.all([
    api.call({ target: DUSD_USDC_POOL, abi: "address:token0", permitFailure: true }),
    api.call({ target: DUSD_USDC_POOL, abi: "address:token1", permitFailure: true }),
    api.call({ target: DUSD_USDC_POOL, abi: slot0Abi, permitFailure: true }),
  ]);
  if (!token0 || !token1 || !slot0) return [];
  const sqrtPriceX96 = Number(slot0.sqrtPriceX96);
  const [d0, d1] = await api.multiCall({
    abi: "erc20:decimals",
    calls: [token0, token1],
    permitFailure: true,
  });
  const dusd = DUSD.toLowerCase();
  const t0 = String(token0).toLowerCase();
  
  // sqrtPriceX96 = sqrt(token1/token0) * 2^96
  let poolRate = (sqrtPriceX96) ** 2 * 10 ** (d0 - d1) / 2 ** 192;
  if (dusd !== t0) poolRate = 1 / poolRate;
  if (!Number.isFinite(poolRate) || poolRate <= 0) return [];
 
  const underlying = (t0 === dusd ? String(token1) : String(token0)).toLowerCase();
  const [underlyingPrices] = await Promise.all([
    getTokenAndRedirectDataMap([underlying], chain, timestamp),
  ]);
  
  const coinData = underlyingPrices[underlying];
  if (!coinData?.price) return [];
  const price = coinData.price * poolRate;
  const writes: Write[] = [];
  addToDBWritesList(writes, chain, DUSD, price, 18, "DUSD", timestamp, "alto", 0.9);
  return writes;
}

export async function alto(timestamp: number = 0) {
  return await getTokenPrices("ethereum", timestamp);
}
