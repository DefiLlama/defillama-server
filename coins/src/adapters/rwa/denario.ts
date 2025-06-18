import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import { addToDBWritesList } from "../utils/database";

const abis = {
  getValue: "function getValue(string key) view returns (uint128,uint128)",
};

type ChainConfig = {
  oracle: string;
  tokens: string[];
  queries: string[];
};

const configs: Record<string, ChainConfig> = {
  polygon: {
    oracle: "0x9be09fa9205e8f6b200d3c71a958ac146913662e",
    tokens: [
      "0x5d4e735784293a0a8d37761ad93c13a0dd35c7e7",
      "0xf7e2d612f1a0ce09ce9fc6fc0b59c7fd5b75042f",
    ],
    queries: ["silvercoin/latest/USD", "goldcoin/latest/USD"],
  },
};

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp);
  const { oracle, tokens, queries } = configs[chain];

  const [symbols, decimals] = await Promise.all([
    api.multiCall({
      abi: "erc20:symbol",
      calls: tokens.map((token) => ({
        target: token,
      })),
    }),
    api.multiCall({
      abi: "erc20:decimals",
      calls: tokens.map((token) => ({
        target: token,
      })),
    }),
  ]);
  const [prices] = await Promise.all([
    api.multiCall({
      target: oracle,
      calls: queries.map((query) => ({ params: [query] })),
      abi: abis.getValue,
    }),
  ]);

  const writes: Write[] = [];

  tokens.forEach((token: any, i: number) => {
    addToDBWritesList(
      writes,
      chain,
      token,
      prices[i][0] / 10 ** decimals[i],
      decimals[i],
      symbols[i],
      timestamp,
      "denario",
      0.8,
    );
  });

  return writes;
}

export async function denario(timestamp: number = 0) {
  return getTokenPrices("polygon", timestamp);
}
