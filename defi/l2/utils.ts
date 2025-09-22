import BigNumber from "bignumber.js";
import { AllProtocols, CoinsApiData, McapsApiData, TokenTvlData } from "./types";
import { canonicalBridgeIds, excludedTvlKeys, geckoSymbols, protocolBridgeIds, zero } from "./constants";
import fetch from "node-fetch";
import { bridgedTvlMixedCaseChains } from "../src/utils/shared/constants";
import sleep from "../src/utils/shared/sleep";
import { call, multiCall } from "@defillama/sdk/build/abi/abi2";
import { Address } from "@defillama/sdk/build/types";
import * as incomingAssets from "./adapters";
import { additional, excluded } from "./adapters/manual";
import { Chain } from "@defillama/sdk/build/general";
import PromisePool from "@supercharge/promise-pool";
import { storeNotTokens } from "../src/utils/shared/bridgedTvlPostgres";
import { getBlock } from "@defillama/sdk/build/util/blocks";
import { Connection, PublicKey } from "@solana/web3.js";
import * as sdk from "@defillama/sdk";
import { struct, u64 } from "../DefiLlama-Adapters/projects/helper/utils/solana/layouts/layout-base.js";
import fetchThirdPartyTokenList from "./adapters/thirdParty";
import { storeR2JSONString } from "../src/utils/r2";

export async function aggregateChainTokenBalances(usdTokenBalances: AllProtocols): Promise<TokenTvlData> {
  const chainUsdTokenTvls: TokenTvlData = {};
  const dependancies: { [chain: string]: string[] } = {};

  Object.keys(usdTokenBalances).map((id: string) => {
    const bridge = usdTokenBalances[id];
    Object.keys(bridge).map((chain: string) => {
      if (canonicalBridgeIds[id] == chain) return;
      if (excludedTvlKeys.includes(chain)) return;

      const dependancy = canonicalBridgeIds[id] ?? protocolBridgeIds[id];

      if (dependancy) {
        if (!(dependancy in dependancies)) dependancies[dependancy] = [];
        dependancies[dependancy].push(chain);
      }

      if (!(chain in chainUsdTokenTvls)) chainUsdTokenTvls[chain] = {};
      Object.keys(bridge[chain]).map((rawSymbol: string) => {
        const symbol = geckoSymbols[rawSymbol.replace("coingecko:", "")] ?? rawSymbol.toUpperCase();
        if (!(symbol in chainUsdTokenTvls[chain])) chainUsdTokenTvls[chain][symbol] = zero;
        chainUsdTokenTvls[chain][symbol] = BigNumber(bridge[chain][rawSymbol]).plus(chainUsdTokenTvls[chain][symbol]);
      });
    });
  });

  await storeR2JSONString("L2-dependancies", JSON.stringify(dependancies));

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
  // const tokenData: any[] = [];
  // await PromisePool.withConcurrency(10)
  //   .for(readRequests)
  //   .process(async (request) => {
  //     tokenData.push(await request());
  //   });

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
  // const tokenData: any[] = [];
  // await PromisePool.withConcurrency(10)
  //   .for(readRequests)
  //   .process(async (request) => {
  //     tokenData.push(await request());
  //   });

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
async function getOsmosisSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Osmosis adapter!`);
  const supplies: { [token: string]: number } = {};
  const notTokens: string[] = [];

  await PromisePool.withConcurrency(3)
    .for(tokens)
    .process(async (token) => {
      try {
        const res = await fetch(`https://lcd.osmosis.zone/cosmos/bank/v1beta1/supply/by_denom?denom=${token}`).then(
          (r) => r.json()
        );
        if (res && res.amount) supplies[`osmosis:${token}`] = res.amount.amount;
        else notTokens.push(token);
      } catch (e) {
        // console.log(token);
      }
    });

  await storeNotTokens(notTokens);
  return supplies;
}
async function getAptosSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Aptos adapter!`);
  const supplies: { [token: string]: number } = {};
  const notTokens: string[] = [];

  await PromisePool.withConcurrency(1)
    .for(tokens)
    .process(async (token) => {
      try {
        const res = await fetch(
          `${process.env.APTOS_RPC}/v1/accounts/${token.substring(
            0,
            token.indexOf("::")
          )}/resource/0x1::coin::CoinInfo%3C${token}%3E`
        ).then((r) => r.json());
        if (res && res.data && res.data.supply)
          supplies[`aptos:${token}`] = res.data.supply.vec[0].integer.vec[0].value;
        else notTokens.push(`aptos:${token}`);
      } catch (e) {
        console.log(token);
      }
    });

  await storeNotTokens(notTokens);
  return supplies;
}

let connection: any = {};

const renecEndpoint = () => process.env.RENEC_RPC;
const eclipseEndpoint = () => process.env.ECLIPSE_RPC ?? "https://eclipse.helius-rpc.com";
const solEndpoint = (isClient: boolean) => {
  if (isClient) return process.env.SOLANA_RPC_CLIENT ?? process.env.SOLANA_RPC ?? "https://rpc.ankr.com/solana";
  return process.env.SOLANA_RPC;
};

const endpointMap: any = {
  solana: solEndpoint,
  renec: renecEndpoint,
  eclipse: eclipseEndpoint,
};

function getConnection(chain = "solana") {
  if (!connection[chain]) connection[chain] = new Connection(endpointMap[chain](true));
  return connection[chain];
}
async function getSolanaTokenSupply(
  tokens: string[],
  chain: string,
  timestamp?: number
): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with ${chain} adapter!`);

  const solanaMintLayout = struct([u64("supply")]);

  const sleepTime = tokens.length > 2000 ? 2000 : 200;
  const tokensPK: PublicKey[] = [];
  const filteredTokens: string[] = [];
  tokens.map((i) => {
    try {
      const key = new PublicKey(i);
      tokensPK.push(key);
      filteredTokens.push(i);
    } catch (e) {}
  });
  const connection = getConnection(chain);
  const res = await runInChunks(tokensPK, (chunk: any) => connection.getMultipleAccountsInfo(chunk), { sleepTime });
  const supplies: { [token: string]: number } = {};

  res.forEach((data, idx) => {
    if (!data) {
      sdk.log(`Invalid account: ${tokens[idx]}`);
      return;
    }
    try {
      const buffer = data.data.slice(36, 44);
      const supply = solanaMintLayout.decode(buffer).supply.toString();
      supplies[`${chain}:` + filteredTokens[idx]] = supply;
    } catch (e) {
      sdk.log(`Error decoding account: ${filteredTokens[idx]}`);
    }
  });

  return supplies;

  async function runInChunks(inputs: any, fn: any, { chunkSize = 99, sleepTime }: any = {}) {
    const chunks = sliceIntoChunks(inputs, chunkSize);
    const results = [];
    for (const chunk of chunks) {
      results.push(...((await fn(chunk)) ?? []));
      if (sleepTime) await sleep(sleepTime);
    }

    return results.flat();

    function sliceIntoChunks(arr: any, chunkSize = 100) {
      const res = [];
      for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        res.push(chunk);
      }
      return res;
    }
  }
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
        if (res[i]) supplies[`${chain}:${bridgedTvlMixedCaseChains.includes(chain) ? c : c.toLowerCase()}`] = res[i];
      });
    } catch {
      try {
        process.env.TRON_RPC = process.env.TRON_RPC?.substring(process.env.TRON_RPC.indexOf(",") + 1);
        await PromisePool.withConcurrency(2)
          .for(contracts.slice(i, i + step))
          .process(async (target) => {
            const res = await call({
              chain,
              target,
              abi: "erc20:totalSupply",
              block,
            }).catch(async (e) => {
              await sleep(2000);
              if (chain == "tron") console.log(`${target}:: \t ${e.message}`);
            });
            if (res)
              supplies[`${chain}:${bridgedTvlMixedCaseChains.includes(chain) ? target : target.toLowerCase()}`] = res;
          });
      } catch (e) {
        if (chain == "tron") console.log(`tron supply call failed`);
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
    if (chain == "osmosis") return await getOsmosisSupplies(tokens, timestamp);
    if (chain == "aptos") return await getAptosSupplies(tokens, timestamp);
    if (Object.keys(endpointMap).includes(chain)) return await getSolanaTokenSupply(tokens, chain, timestamp);
    if (chain == "sui") return await getSuiSupplies(tokens, timestamp);
    return await getEVMSupplies(chain, tokens, timestamp);
  } catch (e) {
    throw new Error(`multicalling token supplies failed for chain ${chain} with ${e}`);
  }
}
export async function fetchBridgeTokenList(chain: Chain): Promise<Address[]> {
  const j = Object.keys(incomingAssets).indexOf(chain);
  try {
    const tokens: Address[] = j == -1 ? [] : await Object.values(incomingAssets)[j]();
    tokens.push(...((await fetchThirdPartyTokenList())[chain] ?? []));
    let filteredTokens: Address[] =
      chain in excluded ? tokens.filter((t: string) => !excluded[chain].includes(t)) : tokens;
    if (!bridgedTvlMixedCaseChains.includes(chain)) filteredTokens = filteredTokens.map((t: string) => t.toLowerCase());

    if (!(chain in additional)) return filteredTokens;

    const additionalTokens = bridgedTvlMixedCaseChains.includes(chain)
      ? additional[chain]
      : additional[chain].map((t: string) => t.toLowerCase());

    return [...new Set([...filteredTokens, ...additionalTokens])];
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
