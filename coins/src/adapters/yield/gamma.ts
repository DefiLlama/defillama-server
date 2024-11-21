import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";

const assets: { [chain: string]: string[] } = {
  bsc: [
    "0x3685502Ea3EA4175FB5cBB5344F74D2138A96708", // sSnBNB-WBNB
    "0xDf0B9b59E92A2554dEdB6F6F4AF6918d79DD54c4", // HAY-USDT
    "0xab092C47b23fBa03Ac1F0EC5F8E94110eb5Fff22", // aUSDT-LISTA
    "0x885711BeDd3D17949DFEd5E77D5aB6E89c3DFc8C", // IV-17-THE
  ],
};

async function getPrices(timestamp: number, chain: string): Promise<Write[]> {
  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const api = await getApi(chain, t, true);

  const [tokens0, tokens1, totalAmounts, decimals, symbols, supplies] =
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
        abi: "function getTotalAmounts() external view returns (uint256, uint256)",
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
    i: number,
    j: number,
  ): { aum: number; confidence: number } | undefined {
    const token = pricingData[tokens[i]];
    if (!token) return;
    return {
      aum: (totalAmounts[i][j] * token.price) / 10 ** token.decimals,
      confidence: token.confidence ?? 0.9,
    };
  }

  const writes: Write[] = [];
  assets[chain].map((token: string, i: number) => {
    const [aum0, aum1] = [getAum(tokens0, i, 0), getAum(tokens0, i, 1)];
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
      "gamma",
      Math.min(aum0.confidence, aum1.confidence),
    );
  });

  return writes;
}

export async function gamma(timestamp: number): Promise<Write[][]> {
  return Promise.all(
    Object.keys(assets).map((chain: string) => getPrices(timestamp, chain)),
  );
}
