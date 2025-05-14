import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const chain: string = "ethereum";
const addresses: { [key: string]: string } = {
  token0: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // 6 dec
  token1: "0x085780639cc2cacd35e474e71f4d000e2405d8f6", // 18 dec
  sp: "0x65c9a641afceb9c0e6034e558a319488fa0fa3be",
};

export async function fxsp(timestamp: number): Promise<Write[]> {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const { token0, token1, sp } = addresses;
  const [tokens0, tokens1, supply] = await Promise.all([
    api.call({
      abi: "uint256:totalStableToken",
      target: sp,
    }),
    api.call({
      abi: "erc20:balanceOf",
      target: token1,
      params: sp,
    }),
    api.call({
      abi: "erc20:totalSupply",
      target: sp,
    }),
  ]);

  const pricingData = await getTokenAndRedirectDataMap(
    [token0, token1],
    chain,
    timestamp,
  );

  const aum0 =
    (tokens0 * pricingData[token0].price) / 10 ** pricingData[token0].decimals;
  const aum1 =
    (tokens1 * pricingData[token1].price) / 10 ** pricingData[token1].decimals;
  const price = ((aum0 + aum1) * 1e18) / supply;

  const confidence = Math.min(
    0.95,
    ...(Object.values(pricingData).map((d) => d.confidence) as any),
  );

  const writes: Write[] = [];
  addToDBWritesList(
    writes,
    chain,
    sp,
    price,
    18,
    "fxSP",
    timestamp,
    "fxsp",
    confidence,
  );

  return writes;
}
