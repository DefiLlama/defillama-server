import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";

const XAUA_ADDRESS = "0xF7303119E4E58C1F912cfC39D30f0167429A3dc2";
const XAU_USD_FEED = "metal.xau:usd";
const GRAMS_PER_TROY_OUNCE = 31.1034768;

export async function alphatoken(timestamp: number = 0) {
  const writes: Write[] = [];
  const [prices, metadata] = await Promise.all([
    getTokenAndRedirectDataMap([XAU_USD_FEED], "pyth", timestamp),
    getTokenInfo("ethereum", [XAUA_ADDRESS], undefined, {
      timestamp,
    }),
  ]);
  const xauUsd = prices[XAU_USD_FEED]?.price;
  const decimalsRes = metadata.decimals?.[0];
  const symbolRes = metadata.symbols?.[0];

  if (!xauUsd) return writes;
  if (!decimalsRes?.success || decimalsRes.output == null) return writes;
  if (!symbolRes?.success || symbolRes.output == null) return writes;

  const xauaUsd = xauUsd / GRAMS_PER_TROY_OUNCE;

  addToDBWritesList(
    writes,
    "ethereum",
    XAUA_ADDRESS,
    xauaUsd,
    Number(decimalsRes.output),
    String(symbolRes.output),
    timestamp,
    "alphatoken",
    0.9,
  );

  return writes;
}
