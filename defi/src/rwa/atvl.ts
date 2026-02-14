import { getAllItemsAtTimeS, getLatestProtocolItems, initializeTVLCacheDB } from "../../src/api2/db";
import { dailyRawTokensTvl, hourlyRawTokensTvl } from "../utils/getLastRecord";
import { excludedTvlKeys } from "../../l2/constants";
import BigNumber from "bignumber.js";
import { coins, } from "@defillama/sdk";
import { getCsvData } from "./spreadsheet";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { fetchSupplies } from "../../l2/utils";
import { getChainDisplayName, getChainIdFromDisplayName } from "../utils/normalizeChain";
import { cachedFetch } from "@defillama/sdk/build/util/cache";
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay } from "../utils/date";
import { storeHistorical, storeMetadata } from "./historical";
import { fetchEvm, fetchSolana, type WalletEntry } from './balances';
import { excludedProtocolCategories, protocolIdMap, categoryMap, unsupportedChains } from "./constants";
import { RWA_KEY_MAP } from "./metadataConstants";
import { createAirtableHeaderToCanonicalKeyMapper, fetchBurnAddresses, formatNumAsNumber, normalizeRwaMetadataForApiInPlace, sortTokensByChain, toFiniteNumberOrNull, toFixedNumber } from "./utils";
import { sendMessage } from "../utils/discord";

// read TVLs from DB and aggregate RWA token tvls
async function getAggregateRawTvls(rwaTokens: { [chain: string]: string[] }, timestamp: number) {
  await initializeTVLCacheDB();

  const rawTvls =
    timestamp == 0
      ? await getLatestProtocolItems(hourlyRawTokensTvl, {
        filterLast24Hours: true,
      })
      : await getAllItemsAtTimeS(dailyRawTokensTvl, timestamp);

  let aggregateRawTvls: { [pk: string]: { [id: string]: BigNumber } } = {};
  rawTvls.forEach((protocol: any) => {
    const category = categoryMap[protocol.id];
    if (excludedProtocolCategories.includes(category)) return;
    Object.keys(protocol.data).forEach((chain: string) => {
      if (excludedTvlKeys.includes(chain)) return;
      if (!rwaTokens[chain]) return;

      Object.keys(protocol.data[chain]).forEach((pk: string) => {
        if (!rwaTokens[chain].includes(pk)) return;
        if (!aggregateRawTvls[pk]) aggregateRawTvls[pk] = {};
        aggregateRawTvls[pk][protocol.id] = BigNumber(protocol.data[chain][pk]);
      });
    });
  });

  return aggregateRawTvls;
}
// fetch total supplies for each token for mcaps
async function getTotalSupplies(tokensSortedByChain: { [chain: string]: string[] }, timestamp: number) {
  const totalSupplies: { [token: string]: number } = {};

  await runInPromisePool({
    items: Object.keys(tokensSortedByChain),
    concurrency: 5,
    processor: async (chain: string) => {
      const tokens: string[] = [];
      tokensSortedByChain[chain].forEach((token: string) => {
        tokens.push(token.substring(token.indexOf(":") + 1));
      });

      try {
        const res = await fetchSupplies(chain, tokens, timestamp == 0 ? undefined : timestamp);
        Object.keys(res).forEach((token: string) => {
          totalSupplies[token] = res[token];
        });
      } catch (e) {
        console.error(`Failed to fetch supplies for ${chain}: ${e}`);
      }
    },
  });

  return totalSupplies;
}
// fetch balances of wallets to be excluded from active mcap 
async function getExcludedBalances(
  timestamp: number,
  finalData: { [protocol: string]: { [key: string]: any } },
  tokenToProjectMap: { [token: string]: string }
) {
  const walletsByChain: { [chain: string]: { [wallet: string]: WalletEntry[] } } = {};
  Object.keys(finalData).forEach((id: string) => {
    const chains = finalData[id]?.holdersToRemove;
    if (!chains || !Object.keys(chains).length) return;
    Object.keys(chains).forEach((chain: string) => {
      const wallets = chains[chain];
      const chainRaw = getChainIdFromDisplayName(chain);
      const assets = finalData[id]?.contracts?.[chain];

      if (!assets) return;
      if (!(chainRaw in walletsByChain)) walletsByChain[chainRaw] = {};

      const burnAddresses = fetchBurnAddresses(chainRaw);
      [...wallets, ...burnAddresses].forEach((address: string) => {
        if (!(address in walletsByChain[chainRaw])) walletsByChain[chainRaw][address] = [];
        walletsByChain[chainRaw][address].push({ id, assets });
      });
    });
  });

  // Convert to array of { id: wallet, assets } per chain for balance fetchers
  const walletsSortedByChain: { [chain: string]: WalletEntry[] } = {};
  Object.keys(walletsByChain).forEach((chain: string) => {
    const byWallet = walletsByChain[chain];
    walletsSortedByChain[chain] = Object.entries(byWallet).map(([wallet, entries]) => ({
      id: wallet,
      assets: [...new Set(entries.flatMap((e) => e.assets))],
    }));
  });

  const excludedAmounts: { [id: string]: { [chain: string]: BigNumber } } = {};
  await runInPromisePool({
    items: Object.keys(walletsSortedByChain),
    concurrency: 1,
    processor: async (chain: any) => {
      try {
        if (chain == 'solana') await fetchSolana(timestamp, walletsSortedByChain[chain], tokenToProjectMap, excludedAmounts);
        else if (unsupportedChains.includes(chain)) return;
        else await fetchEvm(timestamp, chain, walletsSortedByChain[chain], tokenToProjectMap, excludedAmounts);
      } catch (e) {
        console.error(`Failed to fetch balances for ${chain}`)
      }
    },
  });

  return excludedAmounts;
}
// use stablecoin API to fetch mcaps for stablecoins
async function fetchStablecoins(timestamp: number): Promise<{ [gecko_id: string]: { [chain: string]: number } }> {
  const validStablecoinIds: string[] = [];
  const { peggedAssets } = await cachedFetch({
    key: "stablecoin-symbols",
    endpoint: "https://stablecoins.llama.fi/stablecoins",
  });

  const data: { [gecko_id: string]: { [chain: string]: number } } = {};
  peggedAssets.forEach((coin: any) => {
    const { id, chainCirculating, gecko_id, pegType } = coin;
    if (!chainCirculating || !gecko_id || !pegType) return;
    data[gecko_id] = {};
    Object.keys(chainCirculating).forEach((chain: string) => {
      const circulating = chainCirculating[chain].current;
      if (!circulating) return;
      const mcap = circulating[pegType];
      if (!mcap) return;
      validStablecoinIds.push(id);
      data[gecko_id][chain] = toFixedNumber(mcap, 0);
    });
  });

  if (timestamp != 0) return await fetchHistoricalStablecoins(timestamp, validStablecoinIds);

  return data;
}
// fetch historical mcaps for stablecoins
async function fetchHistoricalStablecoins(
  timestamp: number,
  validStablecoinIds: string[]
): Promise<{ [gecko_id: string]: { [chain: string]: number } }> {
  const data: { [gecko_id: string]: { [chain: string]: number } } = {};

  await runInPromisePool({
    items: validStablecoinIds,
    concurrency: 5,
    processor: async (id: string) => {
      const apiData = await cachedFetch({
        key: `stablecoin-historical-${id}`,
        endpoint: `https://stablecoins.llama.fi/stablecoin/${id}`,
      });
      if (!apiData) return;

      const { chainBalances, gecko_id, pegType } = apiData;

      data[gecko_id] = {};
      Object.keys(chainBalances).forEach((chain: string) => {
        const timeseries = chainBalances[chain].tokens;
        const entry = timeseries.find((t: any) => t.date == timestamp);
        if (!entry) return;
        const circulating = entry.circulating;
        if (!circulating) return;
        const mcap = circulating[pegType];
        if (!mcap) return;
        data[gecko_id][chain] = toFixedNumber(mcap, 0);
      });
    },
  });

  return data;
}
// calculate defi active tvls
function getActiveTvls(
  assetPrices: any,
  tokenToProjectMap: any,
  finalData: any,
  protocolIdMap: any,
  aggregateRawTvls: any,
  projectIdsMap: { [rwaId: string]: string }
) {
  Object.keys(aggregateRawTvls).forEach((pk: string) => {
    if (!assetPrices[pk]) {
      console.error(`No price for ${pk}`);
      return;
    }

    const { price, decimals } = assetPrices[pk];
    const amounts = aggregateRawTvls[pk];

    Object.keys(amounts).forEach((amountId: string) => {
      const amount = amounts[amountId];
      const aum = amount.times(price).div(10 ** decimals);

      if (aum.isLessThan(10)) return;
      const rwaId = tokenToProjectMap[pk];
      const projectId = projectIdsMap[rwaId];

      if (Array.isArray(projectId) ? projectId.includes(amountId) : amountId == projectId) return;
      if (Array.isArray(projectId) ? projectId.includes(`${amountId}-treasury`) : `${amountId}-treasury` == projectId) return;
      if (Array.isArray(projectId) ? projectId.map((p: string) => `${p}-treasury`).includes(amountId) : amountId == `${projectId}-treasury`) return;

      try {
        const projectName = protocolIdMap[amountId];
        if (!projectName) return;

        if (!finalData[rwaId][RWA_KEY_MAP.defiActive]) finalData[rwaId][RWA_KEY_MAP.defiActive] = {};
        const chain = pk.substring(0, pk.indexOf(":"));
        const chainDisplayName = getChainDisplayName(chain, true);
        if (!finalData[rwaId][RWA_KEY_MAP.defiActive][chainDisplayName])
          finalData[rwaId][RWA_KEY_MAP.defiActive][chainDisplayName] = {};
        finalData[rwaId][RWA_KEY_MAP.defiActive][chainDisplayName][projectName] = toFixedNumber(aum, 0);
      } catch (e) {
        console.error(`Malformed ${RWA_KEY_MAP.defiActive} for ${rwaId}: ${e}`);
      }
    });
  });
}
// calculate on chain tvls mcaps
function getOnChainTvlAndActiveMcaps(
  assetPrices: any,
  tokenToProjectMap: any,
  finalData: any,
  coingeckoIdToRwaId: { [cgId: string]: string },
  stablecoinsData: any,
  totalSupplies: any,
  excludedAmounts: any
) {
  Object.keys(stablecoinsData).forEach((cgId: string) => {
    const rwaId = coingeckoIdToRwaId[cgId];
    if (!finalData[rwaId]) return;
    finalData[rwaId][RWA_KEY_MAP.onChain] = stablecoinsData[cgId];
    if (!finalData[rwaId][RWA_KEY_MAP.activeMcap] && finalData[rwaId][RWA_KEY_MAP.activeMcapChecked]) finalData[rwaId][RWA_KEY_MAP.activeMcap] = { ...stablecoinsData[cgId] };
  });

  Object.keys(assetPrices).forEach((pk: string) => {
    const rwaId = tokenToProjectMap[pk];
    if (!finalData[rwaId]) return;
    const cgId = finalData[rwaId]?.coingeckoId;
    const chain = pk.substring(0, pk.indexOf(":"));
    const chainDisplayName = getChainDisplayName(chain, true);

    if (cgId && stablecoinsData[cgId]) {
      finalData[rwaId][RWA_KEY_MAP.onChain] = stablecoinsData[cgId];
      if (finalData[rwaId][RWA_KEY_MAP.activeMcapChecked]) {
        if (!finalData[rwaId][RWA_KEY_MAP.activeMcap]) finalData[rwaId][RWA_KEY_MAP.activeMcap] = { ...stablecoinsData[cgId] };
        findActiveMcaps(finalData, rwaId, excludedAmounts, assetPrices[pk], chainDisplayName);
      }
      return;
    }

    const { price, decimals } = assetPrices[pk];
    const supply = totalSupplies[pk];
    if (!supply || !price) {
      console.error(`No supply or price for ${pk}`);
      return;
    }

    if (!finalData[rwaId][RWA_KEY_MAP.price]) {
      finalData[rwaId][RWA_KEY_MAP.price] = formatNumAsNumber(price);
    }

    try {
      if (!finalData[rwaId][RWA_KEY_MAP.onChain]) finalData[rwaId][RWA_KEY_MAP.onChain] = {};
      if (!finalData[rwaId][RWA_KEY_MAP.activeMcap]) finalData[rwaId][RWA_KEY_MAP.activeMcap] = {};
      if (!finalData[rwaId][RWA_KEY_MAP.onChain][chainDisplayName]) finalData[rwaId][RWA_KEY_MAP.onChain][chainDisplayName] = {};

      const aum = (price * supply) / 10 ** decimals;
      finalData[rwaId][RWA_KEY_MAP.onChain][chainDisplayName] = toFixedNumber(aum, 0);
      if (!finalData[rwaId][RWA_KEY_MAP.activeMcapChecked]) return;

      finalData[rwaId][RWA_KEY_MAP.activeMcap][chainDisplayName] = toFixedNumber(aum, 0);

      findActiveMcaps(finalData, rwaId, excludedAmounts, assetPrices[pk], chainDisplayName);
    } catch (e) {
      console.error(`Malformed ${RWA_KEY_MAP.onChain} for ${rwaId}: ${e}`);
    }
  });
}
// deduct excluded amounts for active mcaps
function findActiveMcaps(
  finalData: any,
  rwaId: string,
  excludedAmounts: { [id: string]: { [chainSlug: string]: BigNumber } },
  assetPrices: { price: number; decimals: number },
  chain: string
) {
  if (!finalData[rwaId][RWA_KEY_MAP.activeMcap][chain]) return;
  if (!(rwaId in excludedAmounts)) return;
  const thisChainExcluded = excludedAmounts[rwaId][chain];
  if (!thisChainExcluded) return;
  const excludedUsdValue = thisChainExcluded.div(BigNumber(10).pow(assetPrices.decimals)).times(assetPrices.price);
  finalData[rwaId][RWA_KEY_MAP.activeMcap][chain] = toFixedNumber(
    finalData[rwaId][RWA_KEY_MAP.activeMcap][chain] - excludedUsdValue.toNumber(),
    0
  );
}

// main entry
export default async function main(ts: number = 0) {
  const timestamp = ts != 0 ? getTimestampAtStartOfDay(ts) : 0;

  // read CSV data and parse it
  const parsedCsvData = await getCsvData();
  const rwaTokens: { [protocol: string]: string[] } = {};
  let finalData: { [protocol: string]: { [key: string]: any } } = {};
  const projectIdsMap: { [rwaId: string]: any } = {};
  const coingeckoIdToRwaId: { [cgId: string]: string } = {};

  const headerToKey = createAirtableHeaderToCanonicalKeyMapper(RWA_KEY_MAP);

  // Normalize Airtable rows into canonical keys + API-friendly value types
  parsedCsvData.forEach((row: any) => {
    const mapped: any = {};
    for (const [header, value] of Object.entries(row || {})) {
      const key = headerToKey(String(header));
      if (!key) continue;
      mapped[key] = value;
    }

    const id = mapped.id;
    if (!id) return;
    if (!mapped.ticker) return;

    // Keep raw token identifiers for TVL pipeline BEFORE parsing contracts into {chainLabel: addresses}
    rwaTokens[id] = Array.isArray(mapped.contracts) ? mapped.contracts : mapped.contracts ? [mapped.contracts] : [];

    // Store project ID(s) map for treasury exclusion logic
    const projectId = mapped.projectId;
    if (Array.isArray(projectId) ? projectId.length > 0 : typeof projectId === "string" ? projectId.length > 0 : !!projectId) {
      projectIdsMap[id] = projectId;
    }

    // Store cgId -> rwaId map for stablecoin mcaps
    if (typeof mapped.coingeckoId === "string" && mapped.coingeckoId) {
      coingeckoIdToRwaId[mapped.coingeckoId] = id;
    }

    normalizeRwaMetadataForApiInPlace(mapped);
    finalData[id] = mapped;
  });

  const { tokensSortedByChain, tokenToProjectMap } = sortTokensByChain(rwaTokens);
  const [assetPrices, aggregateRawTvls, totalSupplies, stablecoinsData, excludedAmounts] = await Promise.all([
    coins.getPrices(Object.keys(tokenToProjectMap), timestamp == 0 ? "now" : timestamp),
    getAggregateRawTvls(tokensSortedByChain, timestamp),
    getTotalSupplies(tokensSortedByChain, timestamp),
    fetchStablecoins(timestamp),
    getExcludedBalances(ts, finalData, tokenToProjectMap),
  ]);

  // log missed assets
  Object.keys(tokenToProjectMap).forEach((address: string) => {
    if (!assetPrices[address]) {
      console.error(`No price for ${tokenToProjectMap[address]} at ${address}`);
      return;
    }
  });

  // calculate defi active tvls and on chain mcaps
  getActiveTvls(assetPrices, tokenToProjectMap, finalData, protocolIdMap, aggregateRawTvls, projectIdsMap);
  getOnChainTvlAndActiveMcaps(
    assetPrices,
    tokenToProjectMap,
    finalData,
    coingeckoIdToRwaId,
    stablecoinsData,
    totalSupplies,
    excludedAmounts
  );

  // for read API usage
  // const rwaIdMap: { [id: string]: string } = {};
  // Object.keys(finalData).forEach((rwaId: string) => {
  //   const name = finalData[rwaId].name;
  //   if (name != null && name !== "") rwaIdMap[name] = rwaId;
  // });

  const timestampToPublish = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const filteredFinalData: any = finalData; // {};
  // Object.keys(finalData).forEach((rwaId: string) => {
  //   if (
  //     typeof finalData[rwaId][RWA_KEY_MAP.defiActive] === "object" &&
  //     typeof finalData[rwaId][RWA_KEY_MAP.onChain] === "object"
  //   ) {
  //     filteredFinalData[rwaId] = finalData[rwaId];
  //   }
  // });

  const res = { data: filteredFinalData, timestamp: timestampToPublish };

  await Promise.all([
    timestamp == 0 ? storeMetadata(res) : Promise.resolve(),
    storeHistorical(res),
  ]);

  console.log(`Exitting atvl.ts`)

  return finalData;
}

main().catch(async (error) => {
  console.error('Error running the script: ', error);
  await sendMessage(`Error running the script: ${error}`, process.env.RWA_WEBHOOK!, false);
  process.exit(1);
}).then(() => process.exit(0)); // ts-node defi/src/rwa/atvl.ts