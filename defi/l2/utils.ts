import BigNumber from "bignumber.js";
import { AllProtocols, CoinsApiData, McapsApiData, TokenTvlData } from "./types";
import { canonicalBridgeIds, excludedTvlKeys, geckoSymbols, mixedCaseChains, zero } from "./constants";
import fetch from "node-fetch";
import sleep from "../src/utils/shared/sleep";
import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { Address } from "@defillama/sdk/build/types";
import * as incomingAssets from "./adapters";
import { additional, excluded } from "./adapters/manual";
import { Chain } from "@defillama/sdk/build/general";
import PromisePool from "@supercharge/promise-pool";
import { storeNotTokens } from "./layer2pg";
import { getBlock } from "@defillama/sdk/build/util/blocks";

export function aggregateChainTokenBalances(usdTokenBalances: AllProtocols): TokenTvlData {
  const chainUsdTokenTvls: TokenTvlData = {};

  Object.keys(usdTokenBalances).map((id: string) => {
    const bridge = usdTokenBalances[id];
    Object.keys(bridge).map((chain: string) => {
      if (canonicalBridgeIds[id] == chain) return;
      if (excludedTvlKeys.includes(chain)) return;

      if (!(chain in chainUsdTokenTvls)) chainUsdTokenTvls[chain] = {};
      Object.keys(bridge[chain]).map((rawSymbol: string) => {
        const symbol = geckoSymbols[rawSymbol.replace("coingecko:", "")] ?? rawSymbol.toUpperCase();
        if (!(symbol in chainUsdTokenTvls[chain])) chainUsdTokenTvls[chain][symbol] = zero;
        chainUsdTokenTvls[chain][symbol] = BigNumber(bridge[chain][rawSymbol]).plus(chainUsdTokenTvls[chain][symbol]);
      });
    });
  });

  return chainUsdTokenTvls;
}
async function restCallWrapper(request: () => Promise<any>, retries: number = 8, name: string = "-") {
  while (retries > 0) {
    try {
      const res = await request();
      return res;
    } catch {
      await sleep(60000 + 40000 * Math.random());
      restCallWrapper(request, retries--, name);
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
          fetch(
            `https://coins.llama.fi/prices?source=internal${
              process.env.COINS_KEY ? `?apikey=${process.env.COINS_KEY}` : ""
            }`,
            {
              method: "POST",
              body: JSON.stringify(body),
              headers: { "Content-Type": "application/json" },
            }
          )
            .then((r) => r.json())
            .then((r) =>
              Object.entries(r.coins).map(([PK, value]) => ({
                ...(value as any),
                PK,
              }))
            ),
        undefined,
        "coin prices"
      )
    );
  }

  const tokenData = await Promise.all(readRequests);

  const aggregatedRes: { [address: string]: CoinsApiData } = {};
  const normalizedReadKeys = readKeys.map((k: string) => k.toLowerCase());
  tokenData.map((batch: CoinsApiData[]) => {
    batch.map((a: CoinsApiData) => {
      if (!a.PK) return;
      const i = normalizedReadKeys.indexOf(a.PK.toLowerCase());
      aggregatedRes[readKeys[i]] = a;
    });
  });

  const notPricedTokens = filterForNotTokens(readKeys, Object.keys(aggregatedRes));
  await storeNotTokens(notPricedTokens);

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
      restCallWrapper(
        () =>
          fetch(`https://coins.llama.fi/mcaps${process.env.COINS_KEY ? `?apikey=${process.env.COINS_KEY}` : ""}`, {
            method: "POST",
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
          }).then((r) => r.json()),
        undefined,
        "mcaps"
      )
    );
  }

  const tokenData = await Promise.all(readRequests);

  const aggregatedRes: { [address: string]: any } = {};
  const normalizedReadKeys = readKeys.map((k: string) => k.toLowerCase());
  tokenData.map((batch: { [address: string]: McapsApiData }[]) => {
    Object.keys(batch).map((a: any) => {
      if (!batch[a].mcap) return;
      const i = normalizedReadKeys.indexOf(a.toLowerCase());
      aggregatedRes[readKeys[i]] = batch[a];
    });
  });
  return aggregatedRes;
}
async function getAptosSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Aptos adapter!`);
  const supplies: { [token: string]: number } = {};
  const notTokens: string[] = [];

  await PromisePool.withConcurrency(5)
    .for(tokens)
    .process(async (token) => {
      try {
        const res = await fetch(
          `${process.env.APTOS_RPC}/v1/accounts/${token.substring(
            0,
            token.indexOf("::")
          )}/resource/0x1::coin::CoinInfo%3C${token}%3E`
        ).then((r) => r.json());
        if (res && res.data && res.data.supply) supplies[`sui:${token}`] = res.data.supply.vec[0].integer.vec[0].value;
        else notTokens.push(`sui:${token}`);
      } catch (e) {
        console.log(token);
      }
    });

  await storeNotTokens(notTokens);
  return supplies;
}
async function getSolanaTokenSupply(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Solana adapter!`);

  const supplies: { [token: string]: number } = {};
  let i = 0;
  let j = 0;
  const notTokens: string[] = [];
  console.log(`length: ${tokens.length}`);
  if (!process.env.SOLANA_RPC) throw new Error(`no Solana RPC supplied`);
  await PromisePool.withConcurrency(50)
    .for(tokens)
    .process(async (token) => {
      tokens;
      i;
      try {
        const res = await fetch(process.env.SOLANA_RPC ?? "", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenSupply",
            params: [token],
          }),
        }).then((r) => r.json());
        i++;

        if (res.error) {
          notTokens.push(`solana:${token}`);
          res.error;
        } else supplies[`solana:${token}`] = res.result.value.amount;
      } catch (e) {
        j++;
      }
    });

  let a = Object.keys(supplies).length;
  await storeNotTokens(notTokens);
  return supplies;
}
async function getSuiSupplies(tokens: Address[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Sui adapter!`);
  const supplies: { [token: string]: number } = {};
  const notTokens: string[] = [];

  await PromisePool.withConcurrency(5)
    .for(tokens)
    .process(async (token) => {
      try {
        const res = await fetch("https://fullnode.mainnet.sui.io/", {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "suix_getTotalSupply",
            params: [token],
          }),
          headers: { "Content-Type": "application/json" },
        }).then((r) => r.json());
        if (res && res.result && res.result.value) supplies[`sui:${token}`] = res.result.value;
        else notTokens.push(`sui:${token}`);
      } catch (e) {
        console.log(token);
      }
    });

  await storeNotTokens(notTokens);
  return supplies;
}
async function getEVMSupplies(
  chain: Chain,
  contracts: Address[],
  timestamp?: number
): Promise<{ [token: string]: number }> {
  const step: number = 200;
  const supplies: { [token: string]: number } = {};
  const block: any = timestamp ? await getBlock(chain, timestamp) : undefined;

  for (let i = 0; i < contracts.length; i += step) {
    try {
      const res = await multiCall({
        chain,
        calls: contracts.slice(i, i + step).map((target: string) => ({
          target,
        })),
        abi: "erc20:totalSupply",
        permitFailure: true,
        block: block.block,
      });
      contracts.slice(i, i + step).map((c: Address, i: number) => {
        if (res[i]) supplies[`${chain}:${mixedCaseChains.includes(chain) ? c : c.toLowerCase()}`] = res[i];
      });
    } catch {
      try {
        await PromisePool.withConcurrency(20)
          .for(contracts.slice(i, i + step))
          .process(async (target) => {
            const res = await call({
              chain,
              target,
              abi: "erc20:totalSupply",
              block,
            });
            if (res) supplies[`${chain}:${mixedCaseChains.includes(chain) ? target : target.toLowerCase()}`] = res;
          })
          .catch((e) => {
            e;
          });
      } catch (e) {
        e;
      }
    }
  }

  return supplies;
}
export function filterForNotTokens(tokens: Address[], notTokens: Address[]): Address[] {
  const map: { [token: string]: boolean } = {};
  notTokens.map((item) => (map[item] = true));
  return tokens.filter((item) => !map[item]);
}
export async function fetchSupplies(
  chain: Chain,
  contracts: Address[],
  timestamp: number | undefined
): Promise<{ [token: string]: number }> {
  try {
    const notTokens: string[] = []; //await fetchNotTokens(chain);
    const tokens = filterForNotTokens(contracts, notTokens);
    if (chain == "aptos") return await getAptosSupplies(tokens, timestamp);
    if (chain == "solana") return await getSolanaTokenSupply(tokens, timestamp);
    if (chain == "sui") return await getSuiSupplies(tokens, timestamp);
    return await getEVMSupplies(chain, tokens, timestamp);
  } catch (e) {
    throw new Error(`multicalling token supplies failed for chain ${chain} with ${e}`);
  }
}
export async function fetchBridgeTokenList(chain: Chain): Promise<Address[]> {
  const j = Object.keys(incomingAssets).indexOf(chain);
  if (j == -1) return [];
  try {
    const tokens: Address[] = await Object.values(incomingAssets)[j]();
    let filteredTokens: Address[] =
      chain in excluded ? tokens.filter((t: string) => !excluded[chain].includes(t)) : tokens;
    if (!mixedCaseChains.includes(chain)) filteredTokens = filteredTokens.map((t: string) => t.toLowerCase());

    if (!(chain in additional)) return filteredTokens;

    const additionalTokens = mixedCaseChains.includes(chain)
      ? additional[chain]
      : additional[chain].map((t: string) => t.toLowerCase());

    return [...filteredTokens, ...additionalTokens];
  } catch (e) {
    throw new Error(`${chain} bridge adapter failed with ${e}`);
  }
}

const letterToSeconds: { [symbol: string]: number } = {
  w: 604800,
  d: 86400,
  h: 3600,
  m: 60,
};
export function quantisePeriod(period: string): number {
  let normalizedPeriod: number;
  const normalized = Object.keys(letterToSeconds)
    .map((s: string) => {
      if (!period.includes(s)) return;
      const numberPeriod = period.replace(new RegExp(`[${s}]`, "i"), "");
      normalizedPeriod = Number(numberPeriod == "" ? 1 : numberPeriod);
      return normalizedPeriod * letterToSeconds[s];
    })
    .find((t: any) => t != null);
  if (normalized == null) return Number(period);
  return normalized;
}
export function sortBySize() {
  const coins: { [value: string]: string } = {};

  const res = Object.entries(coins).sort(([_A, valueA], [_B, valueB]) => {
    [_A, _B];
    return Number(valueB) - Number(valueA);
  });
  console.log(res.slice(0, 10));
}
// sortBySize(); // ts-node defi/l2/utils.ts
