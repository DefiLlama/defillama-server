/**
 * Refill-optimised fork of atvl.ts.
 *
 * Splits the monolithic main() into:
 *   prepareAtvlContext()    — fetch CSV + build maps (call ONCE)
 *   runAtvlForTimestamp()   — per-day work (call N times in parallel)
 *
 * This avoids hundreds of redundant Airtable fetches, CSV parses,
 * and constant-data recomputations that the original atvl() repeats
 * on every invocation.
 */

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
import { initPG, fetchLatestAggregateTotals } from "./db";
import { fetchEvm, fetchSolana, fetchProvenance, fetchStellar, type WalletEntry } from './balances';
import { excludedProtocolCategories, protocolIdMap, categoryMap, unsupportedChains, MCAP_EXCLUDED_HOLDERS_BY_PROJECT } from "./constants";
import { RWA_KEY_MAP } from "./metadataConstants";
import { createAirtableHeaderToCanonicalKeyMapper, fetchBurnAddresses, formatNumAsNumber, normalizeRwaMetadataForApiInPlace, sortTokensByChain, toFiniteNumberOrNull, toFixedNumber } from "./utils";
import { sendMessage } from "../utils/discord";

// ── Internal helpers (copied from atvl.ts — identical logic) ────────

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
        if (process.env.DEBUG_ENABLED) console.error(`Failed to fetch supplies for ${chain}: ${e}`);
      }
    },
  });

  return totalSupplies;
}

async function fetchHolderBalances(
  timestamp: number,
  finalData: { [protocol: string]: { [key: string]: any } },
  tokenToProjectMap: { [token: string]: string },
  field: string,
  addBurnAddresses: boolean = false,
  addressesToSkip?: { [id: string]: { [chainLabel: string]: Set<string> } }
) {
  const walletsByChain: { [chain: string]: { [wallet: string]: WalletEntry[] } } = {};
  Object.keys(finalData).forEach((id: string) => {
    const chains = finalData[id]?.[field];
    if (!chains || !Object.keys(chains).length) return;
    Object.keys(chains).forEach((chain: string) => {
      const wallets: string[] = chains[chain];
      const chainRaw = getChainIdFromDisplayName(chain);
      const assets = finalData[id]?.contracts?.[chain];

      if (!assets) return;
      if (!(chainRaw in walletsByChain)) walletsByChain[chainRaw] = {};

      const skipSet = addressesToSkip?.[id]?.[chain];
      const allWallets = addBurnAddresses ? [...wallets, ...fetchBurnAddresses(chainRaw)] : wallets;
      allWallets.forEach((address: string) => {
        if (skipSet?.has(address)) return;
        if (!(address in walletsByChain[chainRaw])) walletsByChain[chainRaw][address] = [];
        walletsByChain[chainRaw][address].push({ id, assets });
      });
    });
  });

  const walletsSortedByChain: { [chain: string]: WalletEntry[] } = {};
  Object.keys(walletsByChain).forEach((chain: string) => {
    const byWallet = walletsByChain[chain];
    walletsSortedByChain[chain] = Object.entries(byWallet).map(([wallet, entries]) => ({
      id: wallet,
      assets: [...new Set(entries.flatMap((e) => e.assets))],
    }));
  });

  const amounts: { [id: string]: { [chain: string]: BigNumber } } = {};
  await runInPromisePool({
    items: Object.keys(walletsSortedByChain),
    concurrency: 1,
    processor: async (chain: any) => {
      try {
        if (chain == 'solana') await fetchSolana(timestamp, walletsSortedByChain[chain], tokenToProjectMap, amounts);
        else if (chain == 'provenance') await fetchProvenance(timestamp, walletsSortedByChain[chain], tokenToProjectMap, amounts);
        else if (chain == 'stellar') await fetchStellar(timestamp, walletsSortedByChain[chain], tokenToProjectMap, amounts);
        else if (unsupportedChains.includes(chain)) return;
        else await fetchEvm(timestamp, chain, walletsSortedByChain[chain], tokenToProjectMap, amounts);
      } catch (e) {
        if (process.env.DEBUG_ENABLED) console.error(`Failed to fetch balances for ${chain}`)
      }
    },
  });

  return amounts;
}

function injectMcapExcludedHolders(finalData: { [protocol: string]: { [key: string]: any } }) {
  Object.keys(finalData).forEach((id) => {
    const projectId = finalData[id]?.projectId;
    if (!projectId) return;

    const projectIds = Array.isArray(projectId) ? projectId : [projectId];
    const contracts = finalData[id]?.contracts;
    if (!contracts) return;

    const exclusions: { [chainLabel: string]: string[] } = {};
    for (const pid of projectIds) {
      const holdersByChain = MCAP_EXCLUDED_HOLDERS_BY_PROJECT[pid];
      if (!holdersByChain) continue;

      Object.keys(contracts).forEach((chainLabel: string) => {
        const chainSlug = getChainIdFromDisplayName(chainLabel);
        const holders = holdersByChain[chainSlug];
        if (!holders) return;
        if (!exclusions[chainLabel]) exclusions[chainLabel] = [];
        holders.forEach(h => {
          if (!exclusions[chainLabel].includes(h)) exclusions[chainLabel].push(h);
        });
      });
    }

    if (Object.keys(exclusions).length > 0) {
      finalData[id].holdersExcludedFromMcap = exclusions;
    }
  });
}

function buildMcapExcludedAddressSet(finalData: { [protocol: string]: { [key: string]: any } }) {
  const result: { [id: string]: { [chainLabel: string]: Set<string> } } = {};
  Object.keys(finalData).forEach((id) => {
    const chains = finalData[id]?.holdersExcludedFromMcap;
    if (!chains) return;
    result[id] = {};
    Object.keys(chains).forEach((chain) => {
      result[id][chain] = new Set(chains[chain]);
    });
  });
  return result;
}

async function getExcludedBalances(
  timestamp: number,
  finalData: { [protocol: string]: { [key: string]: any } },
  tokenToProjectMap: { [token: string]: string }
) {
  const mcapExcludedAmounts = await fetchHolderBalances(
    timestamp, finalData, tokenToProjectMap, 'holdersExcludedFromMcap'
  );

  const mcapExcludedAddresses = buildMcapExcludedAddressSet(finalData);

  const excludedAmounts = await fetchHolderBalances(
    timestamp, finalData, tokenToProjectMap, 'holdersToRemove', true, mcapExcludedAddresses
  );

  return { excludedAmounts, mcapExcludedAmounts };
}

async function fetchStablecoins(timestamp: number, relevantGeckoIds?: Set<string>): Promise<{ [gecko_id: string]: { [chain: string]: number } }> {
  const validStablecoinIds: string[] = [];
  const { peggedAssets } = await cachedFetch({
    key: "stablecoin-symbols",
    endpoint: "https://stablecoins.llama.fi/stablecoins",
  });

  const data: { [gecko_id: string]: { [chain: string]: number } } = {};
  const seenStablecoinIds = new Set<string>();
  const idToGeckoId: { [id: string]: string } = {};
  peggedAssets.forEach((coin: any) => {
    const { id, chainCirculating, gecko_id, pegType } = coin;
    if (!chainCirculating || !gecko_id || !pegType) return;
    idToGeckoId[id] = gecko_id;
    data[gecko_id] = {};
    let hasData = false;
    Object.keys(chainCirculating).forEach((chain: string) => {
      const circulating = chainCirculating[chain].current;
      if (!circulating) return;
      const mcap = circulating[pegType];
      if (!mcap) return;
      hasData = true;
      data[gecko_id][chain] = toFixedNumber(mcap, 0);
    });
    if (hasData && !seenStablecoinIds.has(id)) {
      validStablecoinIds.push(id);
      seenStablecoinIds.add(id);
    }
  });

  if (timestamp != 0) {
    const idsToFetch = relevantGeckoIds
      ? validStablecoinIds.filter((id) => relevantGeckoIds.has(idToGeckoId[id]))
      : validStablecoinIds;
    return await fetchHistoricalStablecoins(timestamp, idsToFetch);
  }

  return data;
}

async function fetchHistoricalStablecoins(
  timestamp: number,
  validStablecoinIds: string[]
): Promise<{ [gecko_id: string]: { [chain: string]: number } }> {
  const data: { [gecko_id: string]: { [chain: string]: number } } = {};
  if (!process.env.INTERNAL_API_KEY) throw new Error("INTERNAL_API_KEY is not set");

  await runInPromisePool({
    items: validStablecoinIds,
    concurrency: 5,
    processor: async (id: string) => {
      const apiData = await cachedFetch({
        key: `stablecoin-historical-${id}`,
        endpoint: `https://pro-api.llama.fi/${process.env.INTERNAL_API_KEY}/stablecoins/stablecoin/${id}`,
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
      if (process.env.DEBUG_ENABLED) console.error(`No price for ${pk}`);
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
        if (process.env.DEBUG_ENABLED) console.error(`Malformed ${RWA_KEY_MAP.defiActive} for ${rwaId}: ${e}`);
      }
    });
  });
}

function deductMcapExclusions(
  finalData: any,
  rwaId: string,
  mcapExcludedAmounts: { [id: string]: { [chainSlug: string]: BigNumber } },
  assetPrices: { price: number; decimals: number },
  chain: string,
  key: string,
) {
  if (!(rwaId in mcapExcludedAmounts)) return;
  const thisChainExcluded = mcapExcludedAmounts[rwaId][chain];
  if (!thisChainExcluded) return;
  const excludedUsdValue = thisChainExcluded.div(BigNumber(10).pow(assetPrices.decimals)).times(assetPrices.price);
  finalData[rwaId][key][chain] = toFixedNumber(
    finalData[rwaId][key][chain] - excludedUsdValue.toNumber(),
    0
  );
}

function getOnChainTvlAndActiveMcaps(
  assetPrices: any,
  tokenToProjectMap: any,
  finalData: any,
  coingeckoIdToRwaId: { [cgId: string]: string },
  stablecoinsData: any,
  totalSupplies: any,
  excludedAmounts: any,
  mcapExcludedAmounts: any,
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
      deductMcapExclusions(finalData, rwaId, mcapExcludedAmounts, assetPrices[pk], chainDisplayName, RWA_KEY_MAP.onChain);
      if (finalData[rwaId][RWA_KEY_MAP.activeMcapChecked]) {
        if (!finalData[rwaId][RWA_KEY_MAP.activeMcap]) finalData[rwaId][RWA_KEY_MAP.activeMcap] = { ...finalData[rwaId][RWA_KEY_MAP.onChain] };
        findActiveMcaps(finalData, rwaId, excludedAmounts, assetPrices[pk], chainDisplayName);
      }
      return;
    }

    const { price, decimals } = assetPrices[pk];
    const supply = totalSupplies[pk];
    if (!supply || !price) {
      if (process.env.DEBUG_ENABLED) console.error(`No supply or price for ${pk}`);
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
      deductMcapExclusions(finalData, rwaId, mcapExcludedAmounts, assetPrices[pk], chainDisplayName, RWA_KEY_MAP.onChain);

      if (!finalData[rwaId][RWA_KEY_MAP.activeMcapChecked]) return;

      finalData[rwaId][RWA_KEY_MAP.activeMcap][chainDisplayName] = finalData[rwaId][RWA_KEY_MAP.onChain][chainDisplayName];

      findActiveMcaps(finalData, rwaId, excludedAmounts, assetPrices[pk], chainDisplayName);
    } catch (e) {
      if (process.env.DEBUG_ENABLED) console.error(`Malformed ${RWA_KEY_MAP.onChain} for ${rwaId}: ${e}`);
    }
  });
}

function findActiveMcaps(
  finalData: any,
  rwaId: string,
  excludedAmounts: { [id: string]: { [chainSlug: string]: BigNumber } },
  assetPrices: { price: number; decimals: number },
  chain: string
) {
  if (!finalData[rwaId][RWA_KEY_MAP.price]) {
    finalData[rwaId][RWA_KEY_MAP.price] = formatNumAsNumber(assetPrices.price);
  }
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

// ── Exported: context + per-timestamp runner ────────────────────────

export interface AtvlContext {
  finalData: { [id: string]: { [key: string]: any } };
  rwaTokens: { [id: string]: string[] };
  tokensSortedByChain: { [chain: string]: string[] };
  tokenToProjectMap: { [token: string]: string };
  projectIdsMap: { [rwaId: string]: any };
  coingeckoIdToRwaId: { [cgId: string]: string };
  ids: string[];
}

/** Fetch CSV once, parse, and build all timestamp-independent data structures. */
export async function prepareAtvlContext(ids: string[] = []): Promise<AtvlContext> {
  const parsedCsvData = await getCsvData();
  const rwaTokens: { [protocol: string]: string[] } = {};
  const finalData: { [protocol: string]: { [key: string]: any } } = {};
  const projectIdsMap: { [rwaId: string]: any } = {};
  const coingeckoIdToRwaId: { [cgId: string]: string } = {};

  const headerToKey = createAirtableHeaderToCanonicalKeyMapper(RWA_KEY_MAP);

  parsedCsvData.forEach((row: any) => {
    const mapped: any = {};
    for (const [header, value] of Object.entries(row || {})) {
      const key = headerToKey(String(header));
      if (!key) continue;
      mapped[key] = value;
    }

    const id = mapped.id;
    if (!id) return;
    if (ids.length > 0 && !ids.includes(id)) return;
    if (!mapped.ticker) return;

    rwaTokens[id] = Array.isArray(mapped.contracts) ? mapped.contracts : mapped.contracts ? [mapped.contracts] : [];

    const projectId = mapped.projectId;
    if (Array.isArray(projectId) ? projectId.length > 0 : typeof projectId === "string" ? projectId.length > 0 : !!projectId) {
      projectIdsMap[id] = projectId;
    }

    if (typeof mapped.coingeckoId === "string" && mapped.coingeckoId) {
      coingeckoIdToRwaId[mapped.coingeckoId] = id;
    }

    normalizeRwaMetadataForApiInPlace(mapped);
    finalData[id] = mapped;
  });

  const { tokensSortedByChain, tokenToProjectMap } = sortTokensByChain(rwaTokens);
  injectMcapExcludedHolders(finalData);

  return { finalData, rwaTokens, tokensSortedByChain, tokenToProjectMap, projectIdsMap, coingeckoIdToRwaId, ids };
}

/** Run the per-timestamp atvl pipeline using a pre-built context. */
export async function runAtvlForTimestamp(
  ts: number,
  context: AtvlContext,
  options: { skipCircuitBreaker?: boolean } = {},
): Promise<{ [id: string]: any }> {
  const timestamp = ts != 0 ? getTimestampAtStartOfDay(ts) : 0;
  const { tokensSortedByChain, tokenToProjectMap, projectIdsMap, coingeckoIdToRwaId, ids } = context;

  // Each timestamp gets its own mutable copy (getActiveTvls / getOnChainTvlAndActiveMcaps mutate finalData)
  const finalData = structuredClone(context.finalData);

  const [assetPrices, aggregateRawTvls, totalSupplies, stablecoinsData, excludedBalancesResult] = await Promise.all([
    coins.getPrices(Object.keys(tokenToProjectMap), timestamp == 0 ? "now" : timestamp),
    getAggregateRawTvls(tokensSortedByChain, timestamp),
    getTotalSupplies(tokensSortedByChain, timestamp),
    fetchStablecoins(timestamp, ids.length > 0 ? new Set(Object.keys(coingeckoIdToRwaId)) : undefined),
    getExcludedBalances(ts, finalData, tokenToProjectMap),
  ]);
  const { excludedAmounts, mcapExcludedAmounts } = excludedBalancesResult;

  Object.keys(tokenToProjectMap).forEach((address: string) => {
    if (!assetPrices[address]) {
      if (process.env.DEBUG_ENABLED) console.error(`No price for ${tokenToProjectMap[address]} at ${address}`);
      return;
    }
  });

  getActiveTvls(assetPrices, tokenToProjectMap, finalData, protocolIdMap, aggregateRawTvls, projectIdsMap);
  getOnChainTvlAndActiveMcaps(
    assetPrices,
    tokenToProjectMap,
    finalData,
    coingeckoIdToRwaId,
    stablecoinsData,
    totalSupplies,
    excludedAmounts,
    mcapExcludedAmounts,
  );

  const timestampToPublish = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const res = { data: finalData, timestamp: timestampToPublish };

  const skipCB = options.skipCircuitBreaker || ids.length > 0;
  if (!skipCB) {
    const circuitBreaker = await checkCircuitBreakers(finalData);
    if (circuitBreaker.triggered) {
      const message = `ATVL Circuit Breaker Triggered - results NOT saved!\n${circuitBreaker.details.join("\n")}`;
      console.error(message);
      await sendMessage(message, process.env.RWA_WEBHOOK!, false);
      return finalData;
    }
  }

  // await Promise.all([
  //   timestamp == 0 ? storeMetadata(res) : Promise.resolve(),
  //   storeHistorical(res as any),
  // ]);

  if (process.env.DEBUG_ENABLED) console.log(`Exitting atvlRefill.ts for ts=${timestamp}`)

  return finalData;
}

// ── Circuit breaker (copied from atvl.ts) ───────────────────────────

const CIRCUIT_BREAKER_THRESHOLD = 0.5;

async function checkCircuitBreakers(
  data: { [id: string]: any }
): Promise<{ triggered: boolean; details: string[] }> {
  const details: string[] = [];

  let newDefiActiveTvl = 0;
  let newOnChainMcap = 0;
  let newActiveMcap = 0;

  Object.keys(data).forEach((id) => {
    const defiActive = data[id][RWA_KEY_MAP.defiActive];
    const onChain = data[id][RWA_KEY_MAP.onChain];
    const activeMcap = data[id][RWA_KEY_MAP.activeMcap];

    Object.values(defiActive ?? {}).forEach((chain: any) => {
      if (typeof chain === "object") {
        Object.values(chain).forEach((val: any) => {
          newDefiActiveTvl += Number(val) || 0;
        });
      }
    });

    Object.values(onChain ?? {}).forEach((val: any) => {
      newOnChainMcap += Number(val) || 0;
    });

    Object.values(activeMcap ?? {}).forEach((val: any) => {
      newActiveMcap += Number(val) || 0;
    });
  });

  await initPG();
  const previous = await fetchLatestAggregateTotals();
  if (!previous) return { triggered: false, details: [] };

  const checks = [
    { name: "defiActiveTvl", prev: previous.defiActiveTvl, curr: newDefiActiveTvl },
    { name: "onChainMcap", prev: previous.onChainMcap, curr: newOnChainMcap },
    { name: "activeMcap", prev: previous.activeMcap, curr: newActiveMcap },
  ];

  for (const { name, prev, curr } of checks) {
    if (prev < 1) continue;
    const ratio = curr / prev;
    if (ratio > 1 + CIRCUIT_BREAKER_THRESHOLD || ratio < 1 - CIRCUIT_BREAKER_THRESHOLD) {
      const changePercent = ((ratio - 1) * 100).toFixed(2);
      details.push(`${name}: $${prev.toFixed(0)} -> $${curr.toFixed(0)} (${changePercent}% change)`);
    }
  }

  return { triggered: details.length > 0, details };
}
