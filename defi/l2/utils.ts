import BigNumber from "bignumber.js";
import { CoinsApiData, TokenTvlData } from "./types";
import { excludedTvlKeys, zero } from "./constants";
import fetch from "node-fetch";

export function aggregateChainTokenBalances(usdTokenBalances: TokenTvlData[][]): TokenTvlData {
  const chainUsdTokenTvls: TokenTvlData = {};

  usdTokenBalances.map((type: TokenTvlData[]) =>
    type.map((bridge: any) => {
      Object.keys(bridge).map((chain: string) => {
        if (excludedTvlKeys.includes(chain)) return;
        if (!(chain in chainUsdTokenTvls)) chainUsdTokenTvls[chain] = {};
        Object.keys(bridge[chain]).map((asset: string) => {
          if (!(asset in chainUsdTokenTvls[chain])) chainUsdTokenTvls[chain][asset] = zero;
          chainUsdTokenTvls[chain][asset] = BigNumber(bridge[chain][asset]).plus(chainUsdTokenTvls[chain][asset]);
        });
      });
    })
  );

  return chainUsdTokenTvls;
}
export async function getPrices(
  readKeys: string[],
  timestamp: number | "now"
): Promise<{ [address: string]: CoinsApiData }> {
  if (!readKeys.length) return {};
  const readRequests: any[] = [];
  for (let i = 0; i < readKeys.length; i += 100) {
    const body = {
      coins: readKeys.slice(i, i + 100),
    } as any;
    if (timestamp !== "now") {
      body.timestamp = timestamp;
    }
    readRequests.push(
      fetch("https://coins.llama.fi/prices?source=internal", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      })
        .then((r) => r.json())
        .then((r) =>
          Object.entries(r.coins).map(([PK, value]) => ({
            ...(value as any),
            PK,
          }))
        )
    );
  }

  const tokenData = await Promise.all(readRequests);

  const aggregatedRes: { [address: string]: CoinsApiData } = {};
  tokenData.map((batch: CoinsApiData[]) => {
    batch.map((a: CoinsApiData) => {
      if (a.PK) aggregatedRes[a.PK] = a;
    });
  });
  return aggregatedRes;
}
