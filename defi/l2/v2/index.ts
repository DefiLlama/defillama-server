import { canonicalBridgeIds, excludedTvlKeys, protocolBridgeIds, zero, ownTokens, allChainKeys } from "../constants";
import { getCurrentUnixTimestamp } from "../../src/utils/date";
type Chain = string;
import { fetchBridgeTokenList, fetchSupplies } from "../utils";
import { fetchAdaTokens } from "../adapters/ada";
import { fetchAllTokens as fetchAllTokensFromDB } from "../../src/utils/shared/bridgedTvlPostgres";
import { withTimeout } from "../../src/utils/shared/withTimeout";
import { CoinsApiData, FinalData, FinalChainData } from "../types";
import { McapsApiData } from "../types";
import * as sdk from '@defillama/sdk'
const { getBlock, } = sdk.util.blocks
const { multiCall, } = sdk.api2.abi
import BigNumber from "bignumber.js";
import {
  bridgedTvlMixedCaseChains,
  chainsThatShouldNotBeLowerCased,
  chainsWithCaseSensitiveDataProviders,
} from "../../src/utils/shared/constants";
import { getR2JSONString, storeR2JSONString } from "../../src/utils/r2";
import { additional, excluded } from "../adapters/manual";
import { storeHistoricalToDB } from "./storeToDb";
import { stablecoins } from "../../src/getProtocols";
import { metadata as rwaMetadata } from "../../src/rwa/protocols";
import { verifyChanges } from "../verifyChanges";
import { initializePriceQueryFilter, whitelistedTokenSetRawPids } from "../../src/storeTvlInterval/computeTVL";
import { getClosestProtocolItem, getLatestProtocolItems, initializeTVLCacheDB } from "../../src/api2/db";
import { hourlyRawTokensTvl } from "../../src/utils/getLastRecord";
import { Balances } from "@defillama/sdk";
import runInPromisePool from "@defillama/sdk/build/util/promisePool";
import { cachedFetch } from "@defillama/sdk/build/util/cache";
import { coins } from "@defillama/sdk";

const searchWidth = 10800; // 3hr
const allTokens: { [chain: Chain]: string[] } = {};

// fetch a list of all token addresses from ES
async function fetchAllTokens() {
  await initializePriceQueryFilter();

  whitelistedTokenSetRawPids.forEach((t) => {
    const seperater = t.indexOf(":");
    const chain = t.substring(0, seperater);

    const address = t.substring(seperater + 1);
    if (address == "undefined") return;

    if (!allTokens[chain]) allTokens[chain] = [];
    allTokens[chain].push(address);
  });

  return allTokens;
}

// find the prices, mcaps and supplies of all tokens on all chains
async function fetchNativeAndMcaps(timestamp: number): Promise<{
  chainData: {
    [chain: Chain]: {
      prices: { [token: string]: CoinsApiData };
      mcaps: { [token: string]: McapsApiData };
      supplies: { [token: string]: number };
    };
  };
  allPrices: { [token: string]: CoinsApiData };
  allMcaps: { [token: string]: McapsApiData };
}> {
  const chainData: {
    [chain: Chain]: {
      prices: { [token: string]: CoinsApiData };
      mcaps: { [token: string]: McapsApiData };
      supplies: { [token: string]: number };
    };
  } = {};

  const allPrices: { [token: string]: CoinsApiData } = {};
  const allMcaps: { [token: string]: McapsApiData } = {};

  await runInPromisePool({
    items: allChainKeys,
    concurrency: 5,
    processor: async (chain: Chain) => {
      // protocol bridge IDs are closed and have no native tvl
      if (Object.values(protocolBridgeIds).includes(chain)) return;
      await withTimeout(1000 * 60 * 20, minted(chain)).catch(() => {
        throw new Error(`fetchMinted() timed out for ${chain}`);
      });

      async function minted(chain: Chain) {
        try {
          const start = new Date().getTime();

          const storedTokens =
            chain == "cardano"
              ? await fetchAdaTokens()
              : [...chainsThatShouldNotBeLowerCased, ...chainsWithCaseSensitiveDataProviders].includes(chain)
              ? await fetchAllTokensFromDB(chain)
              : allTokens[chain];

          const ownTokenCgid: string | undefined = ownTokens[chain]?.address.startsWith("coingecko:")
            ? ownTokens[chain].address
            : undefined;
          if (ownTokenCgid) storedTokens.push(ownTokenCgid);

          // let prices: { [token: string]: CoinsApiData } = {};
          // try {
          //   prices = await getR2JSONString(`prices/${chain}.json`);
          // } catch (e) {
          //   console.log(`${chain} prices not cached, fetching`);
          const prices = await coins.getPrices(
            storedTokens.map((t: string) => normalizeKey(t.startsWith("coingecko:") ? t : `${chain}:${t}`)),
            timestamp
          );
          //   await storeR2JSONString(`prices/${chain}.json`, JSON.stringify(prices));
          // }

          Object.keys(prices).map((p: string) => {
            if (p.startsWith("coingecko:")) prices[p].decimals = 0;
            allPrices[p] = prices[p];
          });

          // let mcaps: { [token: string]: McapsApiData } = {};
          // try {
          //   mcaps = await getR2JSONString(`mcaps/${chain}.json`);
          // } catch (e) {
          // console.log(`${chain} mcaps not cached, fetching`);
          const mcaps = await coins.getMcaps(Object.keys(prices), timestamp);
          //   await storeR2JSONString(`mcaps/${chain}.json`, JSON.stringify(mcaps));
          // }
          Object.keys(mcaps).map((m: string) => {
            allMcaps[m] = mcaps[m];
          });

          // let supplies;
          // try {
          //   supplies = await getR2JSONString(`supplies/${chain}.json`);
          //   if (ownTokenCgid && mcaps[ownTokenCgid])
          //     supplies[ownTokenCgid] = mcaps[ownTokenCgid].mcap / prices[ownTokenCgid].price;
          // } catch (e) {
          //   console.log(`${chain} supplies not cached, fetching`);
          const supplies = await fetchSupplies(
            chain,
            Object.keys(prices).map((t: string) => t.substring(t.indexOf(":") + 1)),
            timestamp
          );
          if (ownTokenCgid && mcaps[ownTokenCgid])
            supplies[ownTokenCgid] = mcaps[ownTokenCgid].mcap / prices[ownTokenCgid].price;
          // await storeR2JSONString(`supplies/${chain}.json`, JSON.stringify(supplies));
          // }

          chainData[chain] = { prices, mcaps, supplies };

          const end = new Date().getTime();
          const time = end - start;
          if (time > 60 * 1000) console.log(`${chain}: ${time}`);
        } catch (e) {
          throw new Error(`fetchNativeAndMcaps() failed for ${chain} with ${e}`);
        }
      }
    },
  });

  return { chainData, allPrices, allMcaps };
}

// incoming asset lists are fetched from canonical bridge token mappings
async function fetchIncomingAssetsList(): Promise<{ [chain: Chain]: string[] }> {
  const incomingAssets: { [chain: Chain]: string[] } = {};

  // fetch all canonical bridge incoming assets
  await runInPromisePool({
    items: allChainKeys,
    concurrency: 5,
    processor: async (chain: Chain) => {
      incomingAssets[chain] = await fetchBridgeTokenList(chain);
    },
  });

  // add any additional hard coded
  Object.keys(additional).map((chain) => {
    if (!incomingAssets[chain]) incomingAssets[chain] = [];
    const additionalTokens = bridgedTvlMixedCaseChains.includes(chain)
      ? additional[chain]
      : additional[chain].map((t: string) => t.toLowerCase());
    incomingAssets[chain].push(...additionalTokens);
  });

  // exclude any unwanted assets
  const filteredIncomingAssets: { [chain: Chain]: string[] } = {};
  Object.keys(incomingAssets).filter((chain: Chain) => {
    filteredIncomingAssets[chain] =
      chain in excluded
        ? incomingAssets[chain].filter((t: string) => !excluded[chain].includes(t))
        : incomingAssets[chain];
  });

  return incomingAssets;
}

// outgoing amounts from chains are derived from balances of canonical bridges of each chain
async function fetchOutgoingAmountsFromDB(timestamp: number): Promise<{
  sourceChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } };
  protocolAmounts: { [protocolSlug: string]: { [token: string]: BigNumber } };
  destinationChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } };
}> {
  const ids: string[] = [...Object.keys(canonicalBridgeIds), ...Object.keys(protocolBridgeIds)];

  await initializeTVLCacheDB();
  const tvls =
    timestamp == 0
      ? await getLatestProtocolItems(hourlyRawTokensTvl, { filterLast24Hours: true })
      : await runInPromisePool({
          items: ids,
          concurrency: 5,
          processor: (i: string) =>
            getClosestProtocolItem(hourlyRawTokensTvl, i, getCurrentUnixTimestamp(), { searchWidth }),
        });

  const sourceChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  const protocolAmounts: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  const destinationChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  tvls.map(({ data, id }: any) => {
    if (!ids.includes(id)) return;
    Object.keys(data).map((chain: string) => {
      if (excludedTvlKeys.includes(chain)) return;
      if (!sourceChainAmounts[chain]) sourceChainAmounts[chain] = {};
      Object.keys(data[chain]).map((token: string) => {
        const key = normalizeKey(token);
        if (!sourceChainAmounts[chain][key]) sourceChainAmounts[chain][key] = zero;
        sourceChainAmounts[chain][key] = sourceChainAmounts[chain][key].plus(data[chain][token]);

        if (Object.keys(protocolBridgeIds).includes(id)) {
          const protocolSlug = protocolBridgeIds[id];
          if (!protocolAmounts[protocolSlug]) protocolAmounts[protocolSlug] = {};
          if (!protocolAmounts[protocolSlug][key]) protocolAmounts[protocolSlug][key] = zero;
          protocolAmounts[protocolSlug][key] = protocolAmounts[protocolSlug][key].plus(data[chain][token]);
          return;
        }

        const destinationChain = canonicalBridgeIds[id];
        if (!destinationChain) return;
        if (!destinationChainAmounts[destinationChain]) destinationChainAmounts[destinationChain] = {};
        if (!destinationChainAmounts[destinationChain][key]) destinationChainAmounts[destinationChain][key] = zero;
        destinationChainAmounts[destinationChain][key] = destinationChainAmounts[destinationChain][key].plus(
          data[chain][token]
        );
      });
    });
  });

  return { sourceChainAmounts, protocolAmounts, destinationChainAmounts };
}

// fetch amounts in hardcoded excluded wallets - eg pre mines etc
async function fetchExcludedAmounts(timestamp: number) {
  const excludedTokensAndOwners: { [chain: string]: [string, string][] } = {
    base: [
      ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x06A19654e0872Ba71c2261EA691Ecf8a0c677156"], // DEGEN
      ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x7d00D30269fC62Ab5fAb54418feeDBdc71FDb25f"], // DEGEN
      ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x6be3ffea7996f0f50b3e5f79372b44d1fd78db30"], // DEGEN
      ["0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", "0x06A19654e0872Ba71c2261EA691Ecf8a0c677156"], // DEGEN
    ],
    hyperliquid: [
      ["0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463", "0x20000000000000000000000000000000000000c5"], // UBTC
      ["0xbe6727b535545c67d5caa73dea54865b92cf7907", "0x20000000000000000000000000000000000000dD"], // UETH
      ["0x068f321fa8fb9f0d135f290ef6a3e2813e1c8a29", "0x20000000000000000000000000000000000000fE"], // USOL
    ],
    metis: [
      ["0x2692BE44A6E38B698731fDDf417d060f0d20A0cB", "0x92370f368242CF442EA10dC299BA8CdB1e6aEE03"], // BNB
    ],
  };

  const excludedAmounts: { [chain: string]: Balances } = {};
  await runInPromisePool({
    items: Object.keys(excludedTokensAndOwners),
    concurrency: 5,
    processor: async (chain: string) => {
      const block = await getBlock(chain, (timestamp == 0 ? getCurrentUnixTimestamp() : timestamp) - 10);

      const balances = await multiCall({
        abi: "erc20:balanceOf",
        calls: excludedTokensAndOwners[chain].map(([token, owner]) => ({ target: token, params: [owner] })),
        chain,
        block: block.number,
      });

      excludedAmounts[chain] = new Balances({ chain });
      excludedTokensAndOwners[chain].map(([token, _], i) => {
        excludedAmounts[chain].add(token, BigNumber(balances[i]));
      });
    },
  });

  return excludedAmounts;
}

// fetch stablecoin symbols
async function fetchStablecoinSymbols() {
  const { peggedAssets } = await cachedFetch({
    key: "stablecoin-symbols",
    endpoint: "https://stablecoins.llama.fi/stablecoins",
  });
  const symbols = peggedAssets.map((s: any) => s.symbol);
  const allSymbols = [...new Set([...symbols, ...stablecoins].map((t) => t.toUpperCase()))];
  return allSymbols;
}

// fetch lst symbols
async function fetchLstSymbols() {
  const assets = await cachedFetch({ key: "lst-symbols", endpoint: "https://yields.llama.fi/lsdRates" });
  const symbols = assets.map((s: any) => s.symbol.toUpperCase());
  return symbols;
}

// fetch rwa symbols
function fetchRwaSymbols() {
  const allSymbols: { [symbol: string]: boolean } = {};
  Object.values(rwaMetadata).map(({ matchExact, symbols }: { matchExact: boolean; symbols: string[] }) => {
    symbols.map((symbol) => (allSymbols[symbol] = matchExact));
  });
  return allSymbols;
}

// check if a symbol is an rwa symbol
function isRwaSymbol(symbol: string, rwaSymbols: { [symbol: string]: boolean }) {
  if (rwaSymbols[symbol]) return true;
  Object.keys(rwaSymbols).map((s) => {
    if (!rwaSymbols[s] && symbol.startsWith(s)) return true;
  });

  return false;
}

// normalize a key to a standard format
function normalizeKey(key: string) {
  if (key.startsWith("0x")) return `ethereum:${key.toLowerCase()}`;
  const [chain, address] = key.split(":");
  if (!address) return `coingecko:${key}`;
  if (chainsThatShouldNotBeLowerCased.includes(chain)) return key;
  if (chainsWithCaseSensitiveDataProviders.includes(chain)) return key;
  return key.toLowerCase();
}

// check if a symbol is an own token
function isOwnToken(chain: string, symbol: string) {
  const ownToken = ownTokens[chain];
  if (!ownToken) return false;

  if (symbol.startsWith("W")) {
    const unwrappedSymbol = symbol.substring(1);
    if (unwrappedSymbol == ownToken.ticker) return true;
  }
  if (symbol == ownToken.ticker) return true;
  return false;
}

// create a new chain assets object
const newChainAssets = () => ({
  canonical: { breakdown: {} },
  thirdParty: { breakdown: {} },
  native: { breakdown: {} },
  ownTokens: { breakdown: {} },
  total: { breakdown: {} },
  rwa: { breakdown: {} },
  lst: { breakdown: {} },
  stablecoins: { breakdown: {} },
});

// main function
export async function storeChainAssetsV2(override: boolean = false) {
  const timestamp = 0;
  await fetchAllTokens();
  const { sourceChainAmounts, protocolAmounts, destinationChainAmounts } = await fetchOutgoingAmountsFromDB(timestamp);
  const incomingAssets = await fetchIncomingAssetsList();
  const excludedAmounts = await fetchExcludedAmounts(timestamp);
  const { chainData, allPrices, allMcaps } = await fetchNativeAndMcaps(timestamp);
  const stablecoinSymbols = await fetchStablecoinSymbols();
  const lstSymbols = await fetchLstSymbols();
  const rwaSymbols = fetchRwaSymbols();

  // adjust native asset balances by excluded and outgoing amounts
  const nativeDataAfterDeductions: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  allChainKeys.map((chain: Chain) => {
    if (Object.values(protocolBridgeIds).includes(chain)) return;
    nativeDataAfterDeductions[chain] = {};

    if (chain in chainData) {
      const { supplies } = chainData[chain];
      Object.keys(supplies).map((token: string) => {
        const key = normalizeKey(token);
        const coinData = allPrices[key];
        if (!coinData || !coinData.price) return;
        const excludedAmount = excludedAmounts[chain]?._balances[key] ?? zero;
        const sourceChainAmount = sourceChainAmounts[chain]?.[key] ?? zero;

        const nativeAmount = BigNumber(supplies[token]);
        const actualAmount = nativeAmount.minus(excludedAmount).minus(sourceChainAmount);
        const usdAmount = BigNumber(
          actualAmount.times(coinData.price).div(BigNumber(10).pow(coinData.decimals)).toFixed(2)
        );
        if (key != "coingecko:bitcoin" && usdAmount.isGreaterThan(BigNumber(1e12))) return;
        nativeDataAfterDeductions[chain][key] = usdAmount;
      });
    }

    if (chain in destinationChainAmounts) {
      const destinationChainAmount = destinationChainAmounts[chain];
      Object.keys(destinationChainAmount).map((token: string) => {
        const key = normalizeKey(token);
        const coinData = allPrices[key];
        if (!coinData || !coinData.price) return;
        const usdAmount = destinationChainAmount[token].times(coinData.price).div(BigNumber(10).pow(coinData.decimals));
        nativeDataAfterDeductions[chain][key] = usdAmount;
      });
    }
  });

  // adjust balances for mcaps
  const nativeDataAfterMcaps: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  Object.keys(nativeDataAfterDeductions).map((chain: Chain) => {
    nativeDataAfterMcaps[chain] = {};
    Object.keys(nativeDataAfterDeductions[chain]).map((key: string) => {
      const cgMcap = BigNumber(allMcaps[key]?.mcap);
      if (cgMcap.isNaN()) return;
      nativeDataAfterMcaps[chain][key] = BigNumber.min(nativeDataAfterDeductions[chain][key], cgMcap);
    });
  });

  // split all chain balances into sections (canonical, thirdParty, native, ownTokens, stablecoins, rwa, lst)
  const rawData: FinalData = {};
  allChainKeys.map((chain: Chain) => {
    rawData[chain] = newChainAssets();
    if (Object.values(protocolBridgeIds).includes(chain)) {
      const protocolAmount = protocolAmounts[chain];
      if (!protocolAmount) {
        console.log(`${chain} protocol amount not found`);
        return;
      }
      Object.keys(protocolAmount).map((token: string) => {
        const key = normalizeKey(token);
        const coinData = allPrices[key];
        if (!coinData || !coinData.price) return;

        const amount = BigNumber(coinData.price).times(protocolAmount[token]).div(BigNumber(10).pow(coinData.decimals));
        const symbol = allPrices[key].symbol.toUpperCase(); // filter for rwa, lst, stablecoins

        let section = "canonical";
        if (isOwnToken(chain, symbol)) {
          if (ownTokens[chain].address.startsWith("coingecko:") && !key.startsWith("coingecko:")) return;
          section = "ownTokens";
        } else if (stablecoinSymbols.includes(symbol)) section = "stablecoins";
        else if (isRwaSymbol(symbol, rwaSymbols)) section = "rwa";
        else if (lstSymbols.includes(symbol)) section = "lst";
        rawData[chain][section as keyof FinalChainData].breakdown[key] = amount;
        if (!isOwnToken(chain, symbol)) rawData[chain].total.breakdown[key] = amount;
      });
    } else {
      Object.keys(nativeDataAfterMcaps[chain]).map((key: string) => {
        if (!allPrices[key]) return;
        const symbol = allPrices[key].symbol.toUpperCase();

        let section = "native";
        if (isOwnToken(chain, symbol)) {
          if (ownTokens[chain].address.startsWith("coingecko:") && !key.startsWith("coingecko:")) return;
          section = "ownTokens";
        } else if (stablecoinSymbols.includes(symbol)) section = "stablecoins";
        else if (isRwaSymbol(symbol, rwaSymbols)) section = "rwa";
        else if (lstSymbols.includes(symbol)) section = "lst";
        else if (incomingAssets[chain] && incomingAssets[chain].includes(key.substring(key.indexOf(":") + 1)))
          section = "thirdParty";
        else if (!key.startsWith("coingecko:") && !key.startsWith(chain)) section = "canonical";
        const amount = nativeDataAfterMcaps[chain][key];
        rawData[chain][section as keyof FinalChainData].breakdown[key] = amount;
        if (section != "ownTokens") rawData[chain].total.breakdown[key] = amount;
      });
    }
  });

  // create a symbol map and symbol data for human readable data
  const symbolMap: { [key: string]: string } = (await getR2JSONString("chainAssetsSymbolMap")) ?? {};
  const symbolData: FinalData = {};
  Object.keys(rawData).map((chain: Chain) => {
    symbolData[chain] = newChainAssets();
    Object.keys(rawData[chain]).map((section: string) => {
      Object.keys(rawData[chain][section as keyof FinalChainData].breakdown).map((key: string) => {
        const symbol = allPrices[key].symbol.toUpperCase();
        if (!symbolData[chain][section as keyof FinalChainData].breakdown[symbol])
          symbolData[chain][section as keyof FinalChainData].breakdown[symbol] = zero;
        symbolData[chain][section as keyof FinalChainData].breakdown[symbol] = symbolData[chain][
          section as keyof FinalChainData
        ].breakdown[symbol].plus(rawData[chain][section as keyof FinalChainData].breakdown[key]);
        if (!symbolMap[key]) symbolMap[key] = symbol;
      });
    });
  });

  // create symbol key data
  const symbolMapPromise = storeR2JSONString("chainAssetsSymbolMap", JSON.stringify(symbolMap));
  [rawData, symbolData].map((allData) => {
    Object.keys(allData).map((chain: Chain) => {
      let totalTotal = zero;
      Object.keys(allData[chain]).map((section: string) => {
        const amounts = Object.values(allData[chain][section as keyof FinalChainData].breakdown);
        const total = amounts.length ? (amounts.reduce((p: any, c: any) => c.plus(p), zero) as BigNumber) : zero;
        allData[chain][section as keyof FinalChainData].total = total;
        if (["ownTokens", "total"].includes(section)) return;
        totalTotal = totalTotal.plus(total);
      });

      allData[chain].total.total = totalTotal;
    });
  });

  // sort symbol data for manual verifcation
  const sortedSymbolData: FinalData = {};
  Object.keys(symbolData).map((chain: Chain) => {
    sortedSymbolData[chain] = newChainAssets();
    Object.keys(symbolData[chain]).map((section: string) => {
      const orderedTokenAmounts = Object.entries(symbolData[chain][section as keyof FinalChainData].breakdown).sort(
        (a: any, b: any) => b[1].minus(a[1])
      );

      const top100Tokens = orderedTokenAmounts.slice(0, 100);
      const topTokensObject: { [key: string]: string } = {};
      top100Tokens.map(([key, value]: any) => {
        topTokensObject[key] = value.toString();
      });

      sortedSymbolData[chain][section as keyof FinalChainData].breakdown = topTokensObject;
      sortedSymbolData[chain][section as keyof FinalChainData].total =
        symbolData[chain][section as keyof FinalChainData].total.toString();
      sortedSymbolData[chain].total.total = symbolData[chain].total.total.toString();
    });
  });

  if (!override) await verifyChanges(symbolData);

  await Promise.all([
    symbolMapPromise,
    storeHistoricalToDB({ timestamp: getCurrentUnixTimestamp(), value: rawData }),
    storeR2JSONString("chainAssets2", JSON.stringify({ timestamp: getCurrentUnixTimestamp(), value: symbolData })),
  ]);
}
