import { canonicalBridgeIds, excludedTvlKeys, protocolBridgeIds, zero, ownTokens, allChainKeys } from "../constants";
import getTVLOfRecordClosestToTimestamp from "../../src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "../../src/utils/date";
import { fetchAllTokens } from "../../src/utils/shared/bridgedTvlPostgres";
import { Chain } from "@defillama/sdk/build/types";
import { getMcaps, getPrices, fetchBridgeTokenList, fetchSupplies } from "../utils";
import { fetchAdaTokens } from "../adapters/ada";
import { withTimeout } from "../../src/utils/shared/withTimeout";
import PromisePool from "@supercharge/promise-pool";
import { CoinsApiData, FinalData, FinalChainData } from "../types";
import { McapsApiData } from "../types";
import { getBlock } from "@defillama/sdk/build/util/blocks";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import BigNumber from "bignumber.js";
import setEnvSecrets from "../../src/utils/shared/setEnvSecrets";
import { bridgedTvlMixedCaseChains, chainsThatShouldNotBeLowerCased } from "../../src/utils/shared/constants";
import { getR2JSONString, storeR2JSONString } from "../../src/utils/r2";
import { additional, excluded } from "../adapters/manual";
import { storeHistoricalToDB } from "./storeToDb";
import { stablecoins } from "../../src/getProtocols";
import { metadata as rwaMetadata } from "../../src/rwa/protocols";
import { verifyChanges } from "../test";

const searchWidth = 10800; // 3hr

async function fetchNativeAndMcaps(
  timestamp: number,
  override: boolean = false
): Promise<{
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

  await PromisePool.withConcurrency(5)
    .for(allChainKeys)
    .process(async (chain: Chain) => {
      if (Object.values(protocolBridgeIds).includes(chain)) return;
      await withTimeout(1000 * 60 * (override ? 120 : 120), minted(chain)).catch(() => {
        throw new Error(`fetchMinted() timed out for ${chain}`);
      });

      async function minted(chain: Chain) {
        try {
          const start = new Date().getTime();
          let storedTokens = await fetchAllTokens(chain);

          if (chain == "cardano") storedTokens = await fetchAdaTokens();

          const ownTokenCgid: string | undefined = ownTokens[chain]?.address.startsWith("coingecko:")
            ? ownTokens[chain].address
            : undefined;
          if (ownTokenCgid) storedTokens.push(ownTokenCgid);

          let prices: { [token: string]: CoinsApiData } = {};
          try {
            prices = await getR2JSONString(`prices/${chain}.json`);
          } catch (e) {
            console.log(`${chain} prices not cached, fetching`);
            prices = await getPrices(
              storedTokens.map((t: string) => normalizeKey(t.startsWith("coingecko:") ? t : `${chain}:${t}`)),
              timestamp
            );
            await storeR2JSONString(`prices/${chain}.json`, JSON.stringify(prices));
          }

          Object.keys(prices).map((p: string) => {
            if (p.startsWith("coingecko:")) prices[p].decimals = 0;
            allPrices[p] = prices[p];
          });

          let mcaps: { [token: string]: McapsApiData } = {};
          try {
            mcaps = await getR2JSONString(`mcaps/${chain}.json`);
          } catch (e) {
            console.log(`${chain} mcaps not cached, fetching`);
            mcaps = await getMcaps(Object.keys(prices), timestamp);
            await storeR2JSONString(`mcaps/${chain}.json`, JSON.stringify(mcaps));
          }
          Object.keys(mcaps).map((m: string) => {
            allMcaps[m] = mcaps[m];
          });

          let supplies;
          try {
            supplies = await getR2JSONString(`supplies/${chain}.json`);
            if (ownTokenCgid && mcaps[ownTokenCgid])
              supplies[ownTokenCgid] = mcaps[ownTokenCgid].mcap / prices[ownTokenCgid].price;
          } catch (e) {
            console.log(`${chain} supplies not cached, fetching`);
            supplies = await fetchSupplies(
              chain,
              Object.keys(prices).map((t: string) => t.substring(t.indexOf(":") + 1)),
              timestamp
            );
            if (ownTokenCgid && mcaps[ownTokenCgid])
              supplies[ownTokenCgid] = mcaps[ownTokenCgid].mcap / prices[ownTokenCgid].price;
            await storeR2JSONString(`supplies/${chain}.json`, JSON.stringify(supplies));
          }

          chainData[chain] = { prices, mcaps, supplies };

          const end = new Date().getTime();
          const time = end - start;
          if (time > 60 * 1000) console.log(`${chain}: ${time}`);
        } catch (e) {
          console.error(`fetchNativeAndMcaps() failed for ${chain} with ${e}`);
        }
      }
    });

  return { chainData, allPrices, allMcaps };
}

async function fetchIncomingAssetsList(): Promise<{ [chain: Chain]: string[] }> {
  const incomingAssets: { [chain: Chain]: string[] } = {};

  await PromisePool.withConcurrency(5)
    .for(allChainKeys)
    .process(async (chain: Chain) => {
      incomingAssets[chain] = await fetchBridgeTokenList(chain);
    });

  Object.keys(additional).map((chain) => {
    if (!incomingAssets[chain]) incomingAssets[chain] = [];
    const additionalTokens = bridgedTvlMixedCaseChains.includes(chain)
      ? additional[chain]
      : additional[chain].map((t: string) => t.toLowerCase());
    incomingAssets[chain].push(...additionalTokens);
  });

  const filteredIncomingAssets: { [chain: Chain]: string[] } = {};
  Object.keys(incomingAssets).filter((chain: Chain) => {
    filteredIncomingAssets[chain] =
      chain in excluded
        ? incomingAssets[chain].filter((t: string) => !excluded[chain].includes(t))
        : incomingAssets[chain];
  });

  return incomingAssets;
}

async function fetchOutgoingAmountsFromDB(timestamp: number): Promise<{
  sourceChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } };
  protocolAmounts: { [protocolSlug: string]: { [token: string]: BigNumber } };
  destinationChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } };
}> {
  const ids: string[] = [...Object.keys(canonicalBridgeIds), ...Object.keys(protocolBridgeIds)];
  const tvls: any[] = await Promise.all(
    ids.map((i: string) =>
      getTVLOfRecordClosestToTimestamp(
        `hourlyRawTokensTvl#${i}`,
        timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
        searchWidth
      )
    )
  );

  const sourceChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  const protocolAmounts: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  const destinationChainAmounts: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  tvls.map((b: any, i: number) => {
    Object.keys(b).map((chain: string) => {
      if (excludedTvlKeys.includes(chain)) return;
      if (!sourceChainAmounts[chain]) sourceChainAmounts[chain] = {};
      Object.keys(b[chain]).map((token: string) => {
        const key = normalizeKey(token);
        if (!sourceChainAmounts[chain][key]) sourceChainAmounts[chain][key] = zero;
        sourceChainAmounts[chain][key] = sourceChainAmounts[chain][key].plus(b[chain][token]);

        const protocolId = b.PK.substring(b.PK.indexOf("#") + 1);
        if (Object.keys(protocolBridgeIds).includes(protocolId)) {
          const protocolSlug = protocolBridgeIds[protocolId];
          if (!protocolAmounts[protocolSlug]) protocolAmounts[protocolSlug] = {};
          if (!protocolAmounts[protocolSlug][key]) protocolAmounts[protocolSlug][key] = zero;
          protocolAmounts[protocolSlug][key] = protocolAmounts[protocolSlug][key].plus(b[chain][token]);
          return;
        }

        const destinationChain = [...Object.values(canonicalBridgeIds), ...Object.values(protocolBridgeIds)][i];
        if (!destinationChainAmounts[destinationChain]) destinationChainAmounts[destinationChain] = {};
        if (!destinationChainAmounts[destinationChain][key]) destinationChainAmounts[destinationChain][key] = zero;
        destinationChainAmounts[destinationChain][key] = destinationChainAmounts[destinationChain][key].plus(
          b[chain][token]
        );
      });
    });
  });

  return { sourceChainAmounts, protocolAmounts, destinationChainAmounts };
}

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

  const excludedAmounts: { [chain: string]: { [token: string]: BigNumber } } = {};
  await Promise.all(
    Object.keys(excludedTokensAndOwners).map(async (chain: string) => {
      const block = await getBlock(chain, (timestamp == 0 ? getCurrentUnixTimestamp() : timestamp) - 10);

      const balances = await multiCall({
        abi: "erc20:balanceOf",
        calls: excludedTokensAndOwners[chain].map(([token, owner]) => ({ target: token, params: [owner] })),
        chain,
        block: block.number,
      });

      excludedTokensAndOwners[chain].map(([token, _], i) => {
        if (!excludedAmounts[chain]) excludedAmounts[chain] = {};
        if (!excludedAmounts[chain][token]) excludedAmounts[chain][token] = zero;
        excludedAmounts[chain][token] = excludedAmounts[chain][token].plus(balances[i]);
      });
    })
  );

  return excludedAmounts;
}

async function fetchStablecoinSymbols() {
  const { peggedAssets } = await fetch("https://stablecoins.llama.fi/stablecoins").then((r) => r.json());
  const symbols = peggedAssets.map((s: any) => s.symbol);
  const allSymbols = [...new Set([...symbols, ...stablecoins].map((t) => t.toUpperCase()))];
  return allSymbols;
}

async function fetchLstSymbols() {
  const assets = await fetch("https://yields.llama.fi/lsdRates").then((r) => r.json());
  const symbols = assets.map((s: any) => s.symbol.toUpperCase());
  return symbols;
}

function fetchRwaSymbols() {
  const allSymbols: {[symbol: string]: boolean } = {};
  Object.values(rwaMetadata).map(({ matchExact, symbols }: { matchExact: boolean; symbols: string[] }) => {
    symbols.map((symbol) => allSymbols[symbol] = matchExact)
  });
  return allSymbols;
}

function isRwaSymbol(symbol: string, rwaSymbols: {[symbol: string]: boolean }) {
  if (rwaSymbols[symbol]) return true;
  Object.keys(rwaSymbols).map((s) => {
    if (!rwaSymbols[s] && symbol.startsWith(s)) return true;
  });

  return false
}

function normalizeKey(key: string) {
  if (key.startsWith("0x")) return `ethereum:${key.toLowerCase()}`;
  const [chain, address] = key.split(":");
  if (!address) return `coingecko:${key}`;
  if (chainsThatShouldNotBeLowerCased.includes(chain)) return key;
  return key.toLowerCase();
}

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

async function main() {
  await setEnvSecrets();
  const timestamp = 0;
  const { sourceChainAmounts, protocolAmounts, destinationChainAmounts } = await fetchOutgoingAmountsFromDB(timestamp);
  const incomingAssets = await fetchIncomingAssetsList();
  const excludedAmounts = await fetchExcludedAmounts(timestamp);
  const { chainData, allPrices, allMcaps } = await fetchNativeAndMcaps(timestamp);
  const stablecoinSymbols = await fetchStablecoinSymbols();
  const lstSymbols = await fetchLstSymbols();
  const rwaSymbols = fetchRwaSymbols();

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
        const excludedAmount = excludedAmounts[chain]?.[key] ?? zero;
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

  const nativeDataAfterMcaps: { [chain: Chain]: { [token: string]: BigNumber } } = {};
  Object.keys(nativeDataAfterDeductions).map((chain: Chain) => {
    nativeDataAfterMcaps[chain] = {};
    Object.keys(nativeDataAfterDeductions[chain]).map((key: string) => {
      const cgMcap = BigNumber(allMcaps[key]?.mcap);
      if (cgMcap.isNaN()) return;
      nativeDataAfterMcaps[chain][key] = BigNumber.min(nativeDataAfterDeductions[chain][key], cgMcap);
    });
  });

  const rawData: FinalData = {};
  allChainKeys.map((chain: Chain) => {
    rawData[chain] = {
      canonical: { breakdown: {} },
      thirdParty: { breakdown: {} },
      native: { breakdown: {} },
      ownTokens: { breakdown: {} },
      total: { breakdown: {} },
      rwa: { breakdown: {} },
      lst: { breakdown: {} },
      stablecoins: { breakdown: {} },
    };
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
        if (isOwnToken(chain, symbol)) section = "ownTokens";
        else if (stablecoinSymbols.includes(symbol)) section = "stablecoins";
        else if (isRwaSymbol(symbol, rwaSymbols)) section = "rwa";
        else if (lstSymbols.includes(symbol)) section = "lst";
        rawData[chain][section as keyof FinalChainData].breakdown[key] = amount;
        if (!isOwnToken(chain, symbol)) rawData[chain].total.breakdown[key] = amount;
      });

      return;
    }

    Object.keys(nativeDataAfterMcaps[chain]).map((key: string) => {
      if (!allPrices[key]) return;
      const symbol = allPrices[key].symbol.toUpperCase();

      let section = "native";
      if (isOwnToken(chain, symbol)) section = "ownTokens";
      else if (stablecoinSymbols.includes(symbol)) section = "stablecoins";
      else if (isRwaSymbol(symbol, rwaSymbols)) section = "rwa";
      else if (lstSymbols.includes(symbol)) section = "lst";
      else if (incomingAssets[chain] && incomingAssets[chain].includes(key.substring(key.indexOf(":") + 1)))
        section = "thirdParty";
      else if (!key.startsWith("coingecko:") && !key.startsWith(chain)) section = "canonical";
      const amount = nativeDataAfterMcaps[chain][key];
      rawData[chain][section as keyof FinalChainData].breakdown[key] = amount;
      if (section != "ownTokens") rawData[chain].total.breakdown[key] = amount;
    });
  });

  const symbolMap: { [key: string]: string } = (await getR2JSONString("chainAssetsSymbolMap")) ?? {};
  const symbolData: FinalData = {};
  Object.keys(rawData).map((chain: Chain) => {
    symbolData[chain] = {
      canonical: { breakdown: {} },
      thirdParty: { breakdown: {} },
      native: { breakdown: {} },
      ownTokens: { breakdown: {} },
      total: { breakdown: {} },
      rwa: { breakdown: {} },
      lst: { breakdown: {} },
      stablecoins: { breakdown: {} },
    };
    Object.keys(rawData[chain]).map((section: string) => {
      Object.keys(rawData[chain][section as keyof FinalChainData].breakdown).map((key: string) => {
        const symbol = allPrices[key].symbol.toUpperCase();
        symbolData[chain][section as keyof FinalChainData].breakdown[symbol] =
          rawData[chain][section as keyof FinalChainData].breakdown[key];
        if (!symbolMap[key]) symbolMap[key] = symbol;
      });
    });
  });

  const symbolMapPromise = storeR2JSONString("chainAssetsSymbolMap", JSON.stringify(symbolMap));
  [rawData, symbolData].map((allData) => {
    Object.keys(allData).map((chain: Chain) => {
      let totalTotal = zero;
      Object.keys(allData[chain]).map((section: string) => {
        if (section == "total") return;
        const amounts = Object.values(allData[chain][section as keyof FinalChainData].breakdown);
        const total = amounts.length ? (amounts.reduce((p: any, c: any) => c.plus(p), zero) as BigNumber) : zero;
        allData[chain][section as keyof FinalChainData].total = total;
        totalTotal = totalTotal.plus(total);
      });

      allData[chain].total.total = totalTotal;
    });
  });

  const sortedSymbolData: FinalData = {};
  Object.keys(symbolData).map((chain: Chain) => {
    sortedSymbolData[chain] = {
      canonical: { breakdown: {} },
      thirdParty: { breakdown: {} },
      native: { breakdown: {} },
      ownTokens: { breakdown: {} },
      total: { breakdown: {} },
      rwa: { breakdown: {} },
      lst: { breakdown: {} },
      stablecoins: { breakdown: {} },
    };
    Object.keys(symbolData[chain]).map((section: string) => {
      const a = Object.entries(symbolData[chain][section as keyof FinalChainData].breakdown).sort((a: any, b: any) =>
        b[1].minus(a[1])
      );
      const b = a.slice(0, 100);
      const c: { [key: string]: string } = {};
      b.map(([key, value]: any) => {
        c[key] = value.toString();
      });
      sortedSymbolData[chain][section as keyof FinalChainData].breakdown = c;
      sortedSymbolData[chain][section as keyof FinalChainData].total =
        symbolData[chain][section as keyof FinalChainData].total.toString();
      sortedSymbolData[chain].total.total = symbolData[chain].total.total.toString();
    });
  });

  const rawDataJson = JSON.parse(JSON.stringify(rawData));
  const symbolDataJson = JSON.parse(JSON.stringify(symbolData));

  await verifyChanges(symbolData);

  await Promise.all([
    symbolMapPromise,
    storeHistoricalToDB({ timestamp: getCurrentUnixTimestamp(), value: rawData }),
    storeR2JSONString("chainAssets2", JSON.stringify({ timestamp: getCurrentUnixTimestamp(), value: symbolData })),
  ]);
}

main(); // ts-node defi/l2/v2/index.ts
