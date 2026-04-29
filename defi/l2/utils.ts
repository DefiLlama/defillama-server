import BigNumber from "bignumber.js";
import { AllProtocols, TokenTvlData } from "./types";
import { canonicalBridgeIds, excludedTvlKeys, geckoSymbols, protocolBridgeIds, zero } from "./constants";
import fetch from "node-fetch";
import { bridgedTvlMixedCaseChains } from "../src/utils/shared/constants";
import sleep from "../src/utils/shared/sleep";
import * as sdk from '@defillama/sdk'
const { multiCall, call } = sdk.api2.abi
type Address = string;
import * as incomingAssets from "./adapters";
import { additional, excluded } from "./adapters/manual";
type Chain = string;
import PromisePool from "@supercharge/promise-pool";
import { Connection, PublicKey } from "@solana/web3.js";
const { getBlock, } = sdk.util.blocks
import fetchThirdPartyTokenList from "./adapters/thirdParty";
import { storeR2JSONString } from "../src/utils/r2";
const BufferLayout = require("buffer-layout");

const uint64 = (property = "uint64") => {
  const layout = BufferLayout.blob(8, property);

  const _decode = layout.decode.bind(layout);
  const _encode = layout.encode.bind(layout);

  layout.decode = (buffer: any, offset: any) => {
    const data = _decode(buffer, offset);
    return new BigNumber(
      [...data]
        .reverse()
        .map((i) => `00${i.toString(16)}`.slice(-2))
        .join(""),
      16
    );
  };

  layout.encode = (num: any, buffer: any, offset: any) => {
    const a = num.toArray().reverse();
    let b = Buffer.from(a);
    if (b.length !== 8) {
      const zeroPad = Buffer.alloc(8);
      b.copy(zeroPad);
      b = zeroPad;
    }
    return _encode(b, buffer, offset);
  };

  return layout;
};

const u64 = uint64

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
async function getOsmosisSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Osmosis adapter!`);
  const supplies: { [token: string]: number } = {};

  await PromisePool.withConcurrency(3)
    .for(tokens)
    .process(async (token) => {
      try {
        const res = await fetch(`https://lcd.osmosis.zone/cosmos/bank/v1beta1/supply/by_denom?denom=${token}`).then(
          (r) => r.json()
        );
        if (res && res.amount) supplies[`osmosis:${token}`] = res.amount.amount;
      } catch (e) {
        // console.log(token);
      }
    });

  return supplies;
}
async function getAptosSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Aptos adapter!`);
  const supplies: { [token: string]: number } = {};
  // Public fullnode is rate-limited but keeps the pipeline working when
  // APTOS_RPC isn't set (e.g. local dev). Prod should still set APTOS_RPC
  // to a dedicated endpoint.
  const rpc = process.env.APTOS_RPC || "https://fullnode.mainnet.aptoslabs.com";

  await PromisePool.withConcurrency(1)
    .for(tokens)
    .process(async (token) => {
      try {
        const isCoinType = token.includes("::");
        if (isCoinType) {
          // Legacy Coin standard: fetch CoinInfo resource
          const accountAddr = token.substring(0, token.indexOf("::"));
          const res = await fetch(
            `${rpc}/v1/accounts/${accountAddr}/resource/0x1::coin::CoinInfo%3C${token}%3E`
          ).then((r) => r.json());
          if (res?.data?.supply?.vec?.[0]?.integer?.vec?.[0]?.value != null) {
            supplies[`aptos:${token}`] = res.data.supply.vec[0].integer.vec[0].value;
            return;
          }
          if (res?.data?.supply?.vec?.[0]?.aggregator?.vec?.[0]?.handle) {
            // Aggregator-based supply (e.g. native APT) — resolve via table item
            const { handle, key } = res.data.supply.vec[0].aggregator.vec[0];
            const aggRes = await fetch(`${rpc}/v1/tables/${handle}/item`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key_type: "address", value_type: "u128", key }),
            }).then((r) => r.json());
            if (typeof aggRes === "string" || typeof aggRes === "number") {
              supplies[`aptos:${token}`] = Number(aggRes);
              return;
            }
          }
        }

        // Fungible Asset standard: token is an object address (no "::")
        const objectAddr = isCoinType ? token.substring(0, token.indexOf("::")) : token;
        // Try ConcurrentSupply first (newer)
        const concurrentRes = await fetch(
          `${rpc}/v1/accounts/${objectAddr}/resource/0x1::fungible_asset::ConcurrentSupply`
        ).then((r) => r.json());
        if (concurrentRes?.data?.current?.value != null) {
          supplies[`aptos:${token}`] = Number(concurrentRes.data.current.value);
          return;
        }
        // Fall back to Supply resource
        const supplyRes = await fetch(
          `${rpc}/v1/accounts/${objectAddr}/resource/0x1::fungible_asset::Supply`
        ).then((r) => r.json());
        if (supplyRes?.data?.current != null) {
          supplies[`aptos:${token}`] = Number(supplyRes.data.current);
        }
      } catch (e) {
        // silent — supply will be missing and logged upstream
      }
    });

  return supplies;
}

let connection: any = {};

const renecEndpoint = () => process.env.RENEC_RPC;
const eclipseEndpoint = () => process.env.ECLIPSE_RPC ?? "https://eclipse.helius-rpc.com";
const solEndpoint = (isClient: boolean) => {
  if (isClient) return process.env.SOLANA_RPC_CLIENT ?? process.env.SOLANA_RPC ?? "https://rpc.ankr.com/solana";
  return process.env.SOLANA_RPC;
};

export const endpointMap: any = {
  solana: solEndpoint,
  renec: renecEndpoint,
  eclipse: eclipseEndpoint,
};

function getConnection(chain = "solana") {
  if (!connection[chain]) connection[chain] = new Connection(endpointMap[chain](true));
  return connection[chain];
}

export async function runInChunks(inputs: any, fn: any, { chunkSize = 99, sleepTime }: any = {}) {
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

async function getSolanaTokenSupply(
  tokens: string[],
  chain: string,
  timestamp?: number
): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with ${chain} adapter!`);

  const solanaMintLayout = BufferLayout.struct([u64("supply")]);

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
}
async function getProvenanceSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Provenance adapter!`);
  const supplies: { [token: string]: number } = {};
  const PROVENANCE_LCD = "https://api.provenance.io";

  await PromisePool.withConcurrency(3)
    .for(tokens)
    .process(async (token) => {
      try {
        const res = await fetch(
          `${PROVENANCE_LCD}/cosmos/bank/v1beta1/supply/by_denom?denom=${encodeURIComponent(token)}`
        ).then((r) => r.json());
        if (res?.amount?.amount) supplies[`provenance:${token}`] = Number(res.amount.amount);
      } catch (e) {}
    });

  return supplies;
}

// Soroban SAC contract ID -> classic "code-issuer" mapping
const stellarSacToClassic: { [contractId: string]: string } = {
  "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75": "USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV": "EURC-GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2",
  "CAUIKL3IYGMERDRUN6YSCLWVAKIFG5Q4YJHUKM4S4NJZQIA3BAS6OJPK": "AQUA-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
  "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY": "BLND-GDJEHTBE6ZHUXSWFI642DCGLUOECLHPF3KSXHPXTSTJ7E3JF6MQ5EZYY",
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA": "XLM",
};

// Fetch total_supply() from a native Soroban token contract via rpc-proxy
async function getSorobanTokenSupply(contractId: string): Promise<number | null> {
  const res = await fetch(`${process.env.RPC_PROXY_URL}/stellar/total-supply/${contractId}`).then((r) => r.json());
  if (typeof res === "string" || typeof res === "number") return Number(res);
  if (res?.error) return null;
  return null;
}

function isSorobanContractId(token: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(token) && !(token in stellarSacToClassic);
}

async function getStellarSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Stellar adapter!`);
  const supplies: { [token: string]: number } = {};

  // ES stores versioned variants of the same Stellar asset (e.g.
  // "blnd-gdjehtbe...-1" in addition to "blnd-gdjehtbe..."). Both hit the
  // same Horizon record, and both would otherwise be summed by symbol
  // downstream — doubling the USDC / USDY / etc. figures for stellar.
  // Dedupe by (code, issuer) pair, keeping the first-seen rawToken as the
  // canonical key we store the supply under.
  const seen = new Map<string, string>();
  const dedupedTokens: string[] = [];
  for (const rawToken of tokens) {
    const upper = rawToken.toUpperCase();
    let canonicalKey: string;
    if (isSorobanContractId(upper)) {
      canonicalKey = upper;
    } else {
      const classicKey = stellarSacToClassic[upper] ?? upper;
      // base (code, issuer); issuer is the trailing 56-char G-prefixed string;
      // anything after that (e.g. "-1", "-2") is a versioning artifact.
      const m = classicKey.match(/^(.+-[A-Z2-7]{55})(?:-\d+)?$/);
      canonicalKey = m ? m[1] : classicKey;
    }
    if (seen.has(canonicalKey)) continue;
    seen.set(canonicalKey, rawToken);
    dedupedTokens.push(rawToken);
  }

  await PromisePool.withConcurrency(3)
    .for(dedupedTokens)
    .process(async (rawToken) => {
      try {
        // Upstream (ES whitelist) stores stellar keys lowercased. Stellar asset
        // issuers and Soroban contract IDs are G/C-prefixed base32 strings that
        // are case-sensitive on Horizon — re-uppercase before querying.
        const token = rawToken.toUpperCase();

        // Native Soroban contracts: call total_supply() via RPC
        if (isSorobanContractId(token)) {
          const supply = await getSorobanTokenSupply(token);
          if (supply != null && supply > BigInt(0)) supplies[`stellar:${rawToken}`] = Number(supply);
          return;
        }

        // Resolve Soroban SAC contract IDs to classic "code-issuer" format
        const classicKey = stellarSacToClassic[token] ?? token;
        if (classicKey === "XLM") return; // native asset handled by ownTokens

        // Token format: "{asset_code}-{asset_issuer}" (dash-separated).
        // Horizon is case-insensitive for asset_code but case-sensitive for
        // asset_issuer.
        const dashIdx = classicKey.lastIndexOf("-");
        if (dashIdx === -1) return;
        const asset_code = classicKey.substring(0, dashIdx);
        const asset_issuer = classicKey.substring(dashIdx + 1).toUpperCase();
        const res = await fetch(
          `https://horizon.stellar.org/assets?asset_code=${asset_code}&asset_issuer=${asset_issuer}&limit=1`
        ).then((r) => r.json());
        const record = res?._embedded?.records?.[0];
        if (record?.balances?.authorized != null) {
          // Horizon exposes amount in display units with 7 implicit decimal places.
          // Multiply by 1e7 to align with decimals=7 returned by the price API.
          // Key the supply under the original (lowercase) token so it matches
          // the keys coins.getPrices returned.
          supplies[`stellar:${rawToken}`] = Math.round(parseFloat(record.balances.authorized) * 1e7);
        }
      } catch (e) {}
    });

  return supplies;
}

async function getStarknetSupplies(tokens: string[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Starknet adapter!`);
  const supplies: { [token: string]: number } = {};
  const STARKNET_RPC = process.env.STARKNET_RPC ?? "https://starknet-mainnet.public.blastapi.io";
  const TOTAL_SUPPLY_SELECTOR = "0x1557182e4359a1f0c6301278e8f5b35a776ab58d39892581e357578fb287836";

  await PromisePool.withConcurrency(5)
    .for(tokens)
    .process(async (token) => {
      try {
        const res = await fetch(STARKNET_RPC, {
          method: "POST",
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "starknet_call",
            params: [
              {
                contract_address: token,
                entry_point_selector: TOTAL_SUPPLY_SELECTOR,
                calldata: [],
              },
              "latest",
            ],
          }),
          headers: { "Content-Type": "application/json" },
        }).then((r) => r.json());
        if (res?.result && res.result.length >= 2) {
          const low = new BigNumber(res.result[0]);
          const high = new BigNumber(res.result[1]);
          const supply = low.plus(high.times(new BigNumber(2).pow(128)));
          if (supply.gt(0)) supplies[`starknet:${token}`] = supply.toNumber();
        }
      } catch (e) {
        e
      }
    });

  return supplies;
}

async function getSuiSupplies(tokens: Address[], timestamp?: number): Promise<{ [token: string]: number }> {
  if (timestamp) throw new Error(`timestamp incompatible with Sui adapter!`);
  const supplies: { [token: string]: number } = {};

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
      } catch (e) {
        // console.log(token);
      }
    });

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
        block: block?.block,
      });
      contracts.slice(i, i + step).map((c: Address, i: number) => {
        if (res[i]) supplies[`${chain}:${bridgedTvlMixedCaseChains.includes(chain) ? c : c.toLowerCase()}`] = res[i];
      });
    } catch (e) {
      try {
        process.env.TRON_RPC = process.env.TRON_RPC?.substring(process.env.TRON_RPC.indexOf(",") + 1);
        await PromisePool.withConcurrency(5)
          .for(contracts.slice(i, i + step))
          .process(async (target) => {
            const res = await call({
              chain,
              target,
              abi: "erc20:totalSupply",
              block,
            }).catch(async (e) => {
              await sleep(1000);
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

export async function fetchSupplies(
  chain: Chain,
  tokens: Address[],
  timestamp: number | undefined
): Promise<{ [token: string]: number }> {
  try {
    if (chain == "osmosis") return await getOsmosisSupplies(tokens, timestamp);
    if (chain == "aptos") return await getAptosSupplies(tokens, timestamp);
    if (Object.keys(endpointMap).includes(chain)) return await getSolanaTokenSupply(tokens, chain, timestamp);
    if (chain == "sui") return await getSuiSupplies(tokens, timestamp);
    if (chain == "provenance") return await getProvenanceSupplies(tokens, timestamp);
    if (chain == "stellar") return await getStellarSupplies(tokens, timestamp);
    if (chain == "starknet") return await getStarknetSupplies(tokens, timestamp);
    return await getEVMSupplies(chain, tokens, timestamp);
  } catch (e) {
    throw new Error(`multicalling token supplies failed for chain ${chain} with ${e}`);
  }
}
export async function fetchBridgeTokenList(chain: Chain): Promise<Address[]> {
  try {
    const tokens: Address[] = incomingAssets[chain as keyof typeof incomingAssets] ? await incomingAssets[chain as keyof typeof incomingAssets]() : []
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
