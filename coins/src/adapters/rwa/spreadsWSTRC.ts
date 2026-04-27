// wSTRC is value-accruing, xSTRC is rebasing,
// wSTRC price = (xSTRC.balanceOf(wSTRC) / wSTRC.totalSupply) * xSTRC price
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const CHAIN = "ink";
const wSTRC = "0x546E01d65f2B1C64C657bD69Ce00f8584Ed798cc";
const xSTRC = "0x1aad217b8f78dba5e6693460e8470f8b1a3977f3";
const XSTRC_CG_ID = "strategy-pp-variable-xstock";

export async function spreadsWSTRC(timestamp: number = 0): Promise<Write[]> {
  const writes: Write[] = [];
  const api = await getApi(CHAIN, timestamp);

  const [escrowed, supply, prices] = await Promise.all([
    api.call({
      target: xSTRC,
      abi: "erc20:balanceOf",
      params: [wSTRC],
    }),
    api.call({ target: wSTRC, abi: "uint256:totalSupply" }),
    getTokenAndRedirectDataMap([XSTRC_CG_ID], "coingecko", timestamp),
  ]);

  const xstrcPrice = (prices as any)?.[XSTRC_CG_ID]?.price;
  if (typeof xstrcPrice !== "number" || !isFinite(xstrcPrice)) return writes;

  const ratio = Number(BigInt(escrowed.toString())) / Number(BigInt(supply.toString()));
  const price = ratio * xstrcPrice;
  if (!isFinite(price) || price <= 0) return writes;

  addToDBWritesList(
    writes,
    CHAIN,
    wSTRC,
    price,
    18,
    "wSTRC",
    timestamp,
    "spreads-finance",
    0.99,
  );
  return writes;
}
