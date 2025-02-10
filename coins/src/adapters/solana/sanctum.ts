import fetch from "node-fetch";
import getWrites from "../utils/getWrites";
import { Write } from "../utils/dbInterfaces";

let url = `https://extra-api.sanctum.so/v1/sol-value/current`;

const assets: { [address: string]: { symbol: string; decimals: number } } = {
  uPtSoL2qszk4SuPHNE2zqk1gDtqCq21ZE1yZCqvFTqq: {
    symbol: "uptSOL",
    decimals: 9,
  },
  picobAEvs6w7QEknPce34wAE4gknZA9v5tTonnmHYdX: {
    symbol: "picoSOL",
    decimals: 9,
  },
  haSo1Vz5aTsqEnz8nisfnEsipvbAAWpgzRDh2WhhMEh: {
    symbol: "haSOL",
    decimals: 9,
  },
  EPCz5LK372vmvCkZH3HgSuGNKACJJwwxsofW6fypCPZL: {
    symbol: "rkSOL",
    decimals: 9,
  },
};

export async function sanctum(timestamp: number) {
  if (timestamp != 0) throw new Error(`Sanctum adapter only works at current`);
  Object.keys(assets).map((a, i) => {
    url = `${url}${i ? "&lst=" : "?lst="}${a}`;
  });

  const prices = await fetch(url).then((r) => r.json());

  const pricesObject: any = {};
  Object.keys(prices.solValues).map((a) => {
    const { symbol, decimals } = assets[a];
    if (!symbol || !decimals) return;

    pricesObject[a] = {
      underlying: "0x60e14dd50ef2ff19cd1c71b76f1e17054a32f030",
      symbol,
      decimals,
      price: prices.solValues[a] / 10 ** decimals,
    };
  });

  const writes: Write[] = [];
  return await getWrites({
    underlyingChain: "era",
    chain: "solana",
    timestamp,
    pricesObject,
    projectName: "sanctum",
    writes,
  });
}
