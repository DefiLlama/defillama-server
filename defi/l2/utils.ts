import BigNumber from "bignumber.js";
import { CoinsApiData, McapsApiData, TokenTvlData } from "./types";
import { excludedTvlKeys, zero } from "./constants";
import fetch from "node-fetch";
import sleep from "../src/utils/shared/sleep";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { Address } from "@defillama/sdk/build/types";
import * as incomingAssets from "./adapters";
import { additional, excluded } from "./adapters/manual";
import { Chain } from "@defillama/sdk/build/general";

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
export async function fetchSupplies(chain: Chain, contracts: Address[]): Promise<{ [token: string]: number }> {
  try {
    const res = await multiCall({
      chain,
      calls: contracts.map((target: string) => ({
        target,
      })),
      abi: "erc20:totalSupply",
      permitFailure: true,
    });
    const supplies: { [token: string]: number } = {};
    contracts.map((c: Address, i: number) => {
      if (res[i]) supplies[c] = res[i];
    });
    return supplies;
  } catch (e) {
    throw new Error(`multicalling token supplies failed for chain ${chain}`);
  }
}
export async function fetchBridgeTokenList(chain: Chain): Promise<Address[]> {
  const j = Object.keys(incomingAssets).indexOf(chain);
  if (j == -1) return [];
  try {
    const tokens: Address[] = await Object.values(incomingAssets)[j]();
    const filteredTokens: Address[] =
      chain in excluded ? tokens.filter((t: string) => !excluded[chain].includes(t)) : tokens;
    const normalizedTokens: Address[] = filteredTokens.map((t: string) => t.toLowerCase());
    if (!(chain in additional)) return normalizedTokens;
    const additionalTokens = additional[chain].map((t: string) => t.toLowerCase());
    return [...normalizedTokens, ...additionalTokens];
  } catch {
    throw new Error(`${chain} bridge adapter failed`);
  }
}
export function sortBySize() {
  const coins: { [value: string]: string } = {};
  const res = Object.entries(coins).sort(([_A, valueA], [_B, valueB]) => {
    [_A, _B];
    return Number(valueB) - Number(valueA);
  });
  console.log(res.slice(0, 10));
}
