import fetch from "node-fetch";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";

export async function quipuswap(timestamp: number = 0) {
  if (timestamp && timestamp != 0)
    throw new Error(`Quipuswap adapter can only work with current timestamp`);

  const pricesObject: any = {};
  const writes: Write[] = [];

  const res = await fetch(
    "https://temple-api-mainnet.prod.templewallet.com/api/exchange-rates",
  ).then((res) => res.json());

  res.map(({ tokenAddress, exchangeRate, metadata }: any) => {
    if (!metadata) return;
    const { symbol, decimals, tokenId } = metadata;

    pricesObject[`${tokenAddress}-${tokenId}`] = {
      symbol,
      decimals,
      price: exchangeRate,
    };
  });

  return await getWrites({
    chain: "tezos",
    timestamp,
    pricesObject,
    projectName: "quipuswap",
    writes,
    confidence: 1,
  });
}
