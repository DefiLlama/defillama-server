import BigNumber from "bignumber.js";
import { CoinsApiData, TokenTvlData } from "./types";
import { excludedTvlKeys, zero } from "./constants";
import fetch from "node-fetch";
import sleep from "../src/utils/shared/sleep";

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
async function restCallWrapper(request: () => Promise<any>, retries: number = 4, name: string = "-") {
  while (retries > 0) {
    try {
      const res = await request();
      return res;
    } catch {
      await sleep(6000 + 2e4 * Math.random());
      restCallWrapper(request, retries--);
    }
  }
  throw new Error(`couldnt work ${name} call after retries!`);
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
      restCallWrapper(
        () =>
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
            ),
        3,
        "coin prices"
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

type McapsApiData = {
  mcap: number;
  timestamp: number;
};
export async function getMcaps(
  readKeys: string[],
  timestamp: number | "now"
): Promise<{ [address: string]: McapsApiData }> {
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
      restCallWrapper(() =>
        fetch("https://coins.llama.fi/mcaps", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }).then((r) => r.json())
      )
    );
  }

  const tokenData = await Promise.all(readRequests);

  const aggregatedRes: { [address: string]: any } = {};
  tokenData.map((batch: { [address: string]: McapsApiData }[]) => {
    Object.keys(batch).map((a: any) => {
      if (batch[a].mcap) aggregatedRes[a] = batch[a];
    });
  });
  return aggregatedRes;
}
