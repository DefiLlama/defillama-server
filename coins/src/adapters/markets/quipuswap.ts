import fetch from "node-fetch";
import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";

const fa2priorities: { [address: string]: string } = {
  KT1XRPEPXbZK25r3Htzp2o1x7xdMMmfocKNW: "uUSD",
};

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
    const { symbol, decimals } = metadata;

    if (fa2priorities[tokenAddress] && fa2priorities[tokenAddress] != symbol)
      return;

    pricesObject[tokenAddress] = {
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
    confidence: 0.7,
  });
}
