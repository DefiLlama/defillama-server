import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const assets: { [chain: string]: string[] } = {
  bsc: [
    "0x04d6115703b0127888323F142B8046C7c13f857d", // HAY/FRAX
  ],
};

async function getPrices(timestamp: number, chain: string): Promise<Write[]> {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const [tokens0, tokens1, reserves0, reserves1, decimals, symbols, supplies] =
    await Promise.all([
      api
        .multiCall({
          abi: "address:token0",
          calls: assets[chain].map((target: string) => ({ target })),
        })
        .then((rs) => rs.map((r) => r.toLowerCase())),
      api
        .multiCall({
          abi: "address:token1",
          calls: assets[chain].map((target: string) => ({ target })),
        })
        .then((rs) => rs.map((r) => r.toLowerCase())),
      api.multiCall({
        abi: "uint256:reserve0",
        calls: assets[chain].map((target: string) => ({ target })),
      }),
      api.multiCall({
        abi: "uint256:reserve1",
        calls: assets[chain].map((target: string) => ({ target })),
      }),
      api.multiCall({
        abi: "erc20:decimals",
        calls: assets[chain].map((target: string) => ({ target })),
      }),
      api.multiCall({
        abi: "erc20:symbol",
        calls: assets[chain].map((target: string) => ({ target })),
      }),
      api.multiCall({
        abi: "erc20:totalSupply",
        calls: assets[chain].map((target: string) => ({ target })),
      }),
    ]);

  const pricingData = await getTokenAndRedirectDataMap(
    [...tokens0, ...tokens1],
    chain,
    timestamp,
  );

  function getAum(
    tokens: string[],
    reserves: number[],
    i: number,
  ): { aum: number; confidence: number } | undefined {
    const token = pricingData[tokens[i]];
    if (!token) return;
    return {
      aum: (reserves[i] * token.price) / 10 ** token.decimals,
      confidence: token.confidence ?? 0.9,
    };
  }

  const writes: Write[] = [];
  assets[chain].map((token: string, i: number) => {
    const [aum0, aum1] = [
      getAum(tokens0, reserves0, i),
      getAum(tokens1, reserves1, i),
    ];
    if (!aum0 || !aum1) return;

    const price = (aum0.aum + aum1.aum) / (supplies[i] / 10 ** decimals[i]);

    addToDBWritesList(
      writes,
      chain,
      token,
      price,
      decimals[i],
      symbols[i],
      timestamp,
      "thena",
      Math.min(aum0.confidence, aum1.confidence),
    );
  });

  return writes;
}

export async function thena(timestamp: number): Promise<Write[][]> {
  return Promise.all(
    Object.keys(assets).map((chain: string) => getPrices(timestamp, chain)),
  );
}
