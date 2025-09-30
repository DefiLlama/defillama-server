import getTokenPrices from "./pendle";
import { getPenpiePrices } from "./penpie";

const config: { [chain: string]: { pendleOracle: string } } = {
  ethereum: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  arbitrum: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  bsc: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  optimism: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  mantle: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  sonic: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  base: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  berachain: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
  hyperliquid: {
    pendleOracle: "0x9a9fa8338dd5e5b2188006f1cd2ef26d921650c2",
  },
};

export async function pendle(timestamp: number = 0) {
  return Promise.all([
    ...Object.keys(config).map((chain: string) =>
      getTokenPrices(timestamp, chain, config[chain]),
    ),
    // getApiPrices(timestamp),
  ]);
}

const masters: { [chain: string]: { target: string; fromBlock: number } } = {
  arbitrum: {
    target: "0x0776C06907CE6Ff3d9Dbf84bA9B3422d7225942D",
    fromBlock: 97640252,
  },
  ethereum: {
    target: "0x16296859C15289731521F199F0a5f762dF6347d0",
    fromBlock: 17406748,
  },
  bsc: {
    target: "0xb35b3d118c0394e750b4b59d2a2f9307393cd5db",
    fromBlock: 29693582,
  },
};

export async function penpie(timestamp: number = 0) {
  return Promise.all(
    Object.keys(masters).map((chain: string) =>
      getPenpiePrices(timestamp, chain, masters[chain]),
    ),
  );
}
