import {
  storeRouteData,
  clearOldCacheVersions,
  getCacheVersion,
  getSyncMetadata,
  setSyncMetadata,
  storeHistoricalDataForId,
  readHistoricalDataForId,
  mergeHistoricalData,
  storePGCacheForId,
  readPGCacheForId,
  mergePGCacheData,
  PGCacheData,
  PGCacheRecord,
} from './file-cache';
import { initPG, fetchCurrentPG, fetchMetadataPG, fetchAllDailyRecordsPG, fetchMaxUpdatedAtPG, fetchAllDailyIdsPG, fetchDailyRecordsForIdPG, fetchDailyRecordsWithChainsPG, fetchDailyRecordsWithChainsForIdPG } from './db';

import * as sdk from '@defillama/sdk';
import { formatNumAsNumber, toFiniteNumberOrNull, toFiniteNumberOrZero } from './utils';

interface RWACurrentData {
  id: string;
  timestamp: number;
  defiactivetvl: object;
  mcap: object;
  activemcap: object;
}

// Convert chain keys to chain labels in an object, coercing values to numbers
function convertChainKeysToLabelsNumber(obj: { [chainKey: string]: any }): { [chainLabel: string]: number } {
  const result: { [chainLabel: string]: number } = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const chainKey of Object.keys(obj)) {
    const chainLabel = (sdk as any).chainUtils.getChainLabelFromKey(chainKey);
    result[chainLabel] = toFiniteNumberOrZero(obj[chainKey]);
  }
  return result;
}

// Convert chain keys to chain labels in a nested object, coercing inner values to numbers
function convertChainKeysToLabelsNestedNumber(
  obj: { [chainKey: string]: any }
): { [chainLabel: string]: { [key: string]: number } } {
  const result: { [chainLabel: string]: { [key: string]: number } } = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const chainKey of Object.keys(obj)) {
    const chainLabel = (sdk as any).chainUtils.getChainLabelFromKey(chainKey);
    const protocols = obj[chainKey];
    const outProtocols: { [key: string]: number } = {};
    if (protocols && typeof protocols === 'object') {
      for (const [p, v] of Object.entries(protocols)) {
        outProtocols[p] = toFiniteNumberOrZero(v);
      }
    }
    result[chainLabel] = outProtocols;
  }
  return result;
}

interface RWAMetadata {
  id: string;
  data: any;
}

async function generateCurrentData(metadata: RWAMetadata[]): Promise<{ data: any[]; timestamp: number }> {
  console.log('Generating current RWA data...');
  const startTime = Date.now();

  const current = await fetchCurrentPG();
  const currentMap: { [id: string]: RWACurrentData } = {};
  current.forEach((c: any) => { currentMap[c.id] = c; });

  const data: any[] = [];
  let timestamp = 0;

  metadata.forEach((m: RWAMetadata) => {
    const idCurrent = currentMap[m.id]
    m.data.id = m.id

    if (!idCurrent) return;

    if (idCurrent.timestamp > timestamp) timestamp = idCurrent.timestamp;

    // Ensure consistent types in API output
    // price must always be number|null (never a string)
    if ('price' in (m.data as any)) {
      (m.data as any).price = toFiniteNumberOrNull((m.data as any).price);
      if ((m.data as any).price != null) (m.data as any).price = formatNumAsNumber((m.data as any).price);
    }

    // Expose camelCase fields in API responses; do not expose "mcap" (use "onChainMcap" instead).
    delete (m.data as any).mcap;
    m.data.onChainMcap = convertChainKeysToLabelsNumber(idCurrent.mcap as any);
    m.data.activeMcap = convertChainKeysToLabelsNumber(idCurrent.activemcap as any);
    m.data.defiActiveTvl = convertChainKeysToLabelsNestedNumber(idCurrent.defiactivetvl as any);

    data.push(m.data);
  });

  console.log(`Generated current data in ${Date.now() - startTime}ms`);
  return { data, timestamp };
}

function generateIdMap(
  metadata: Array<{ id: string; data: any; ticker: string }>
): { [name: string]: string } {
  const idMap: { [name: string]: string } = {};

  metadata.forEach((m: RWAMetadata) => {
    const ticker = m.data.ticker
    const id = m.id
    if (ticker && id) idMap[ticker] = id;
  });

  return idMap;
}

async function generateAllHistoricalDataIncremental(): Promise<{ updatedIds: number; totalRecords: number }> {
  console.log('Generating historical data incrementally...');
  const startTime = Date.now();

  // Get sync metadata to determine if this is a full or incremental sync
  const syncMetadata = await getSyncMetadata();
  const lastSyncTimestamp = syncMetadata?.lastSyncTimestamp
    ? new Date(syncMetadata.lastSyncTimestamp)
    : undefined;

  let updatedIds = 0;
  let totalRecords = 0;

  if (lastSyncTimestamp) {
    // Incremental sync: fetch only updated records
    console.log(`Incremental sync: fetching records updated after ${lastSyncTimestamp.toISOString()}`);

    const dailyRecords = await fetchAllDailyRecordsPG(lastSyncTimestamp);
    console.log(`Fetched ${dailyRecords.length} updated daily records from database`);

    if (dailyRecords.length === 0) {
      console.log('No new records to process');
      return { updatedIds: 0, totalRecords: 0 };
    }

    // Group records by ID
    const recordsById: { [id: string]: any[] } = {};
    dailyRecords.forEach((record) => {
      if (!recordsById[record.id]) {
        recordsById[record.id] = [];
      }
      recordsById[record.id].push({
        timestamp: record.timestamp,
        onChainMcap: record.aggregatemcap,
        defiActiveTvl: record.aggregatedefiactivetvl,
        activeMcap: record.aggregatedactivemcap,
      });
    });

    const ids = Object.keys(recordsById);
    console.log(`Processing ${ids.length} unique IDs with updates`);

    // Process each ID with updates
    for (const id of ids) {
      try {
        const newRecords = recordsById[id];
        const existingData = await readHistoricalDataForId(id);
        const mergedData = mergeHistoricalData(existingData, newRecords);
        await storeHistoricalDataForId(id, mergedData);
        updatedIds++;
        totalRecords += newRecords.length;
      } catch (e) {
        console.error(`Error processing historical data for ${id}:`, (e as any)?.message);
      }
    }
  } else {
    // Full sync: fetch one ID at a time to avoid memory issues
    console.log('Full sync: fetching all daily records one ID at a time');

    const allIds = await fetchAllDailyIdsPG();
    console.log(`Found ${allIds.length} unique IDs to process`);

    for (let i = 0; i < allIds.length; i++) {
      const id = allIds[i];
      try {
        const records = await fetchDailyRecordsForIdPG(id);
        if (records.length === 0) continue;

        const historicalData = records.map((record) => ({
          timestamp: record.timestamp,
          onChainMcap: record.aggregatemcap,
          defiActiveTvl: record.aggregatedefiactivetvl,
          activeMcap: record.aggregatedactivemcap,
        }));

        await storeHistoricalDataForId(id, historicalData);
        updatedIds++;
        totalRecords += records.length;

        if ((i + 1) % 100 === 0) {
          console.log(`Processed ${i + 1}/${allIds.length} IDs`);
        }
      } catch (e) {
        console.error(`Error processing historical data for ${id}:`, (e as any)?.message);
      }
    }
  }

  // Update sync metadata
  const maxUpdatedAt = await fetchMaxUpdatedAtPG();
  await setSyncMetadata({
    lastSyncTimestamp: maxUpdatedAt?.toISOString() || null,
    lastSyncDate: new Date().toISOString(),
    totalIds: updatedIds,
  });

  console.log(`Generated historical data for ${updatedIds} IDs in ${Date.now() - startTime}ms`);
  return { updatedIds, totalRecords };
}

function sumObjectValues(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  return Object.values(obj).reduce((sum: number, val) => {
    const num = Number(val);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
}

function sumNestedObjectValues(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  return Object.values(obj).reduce((sum: number, inner: any) => {
    return sum + sumObjectValues(inner);
  }, 0);
}

function processRecordsToPGCache(records: any[]): PGCacheData {
  const data: PGCacheData = {};
  for (const record of records) {
    // DB functions already parse JSON fields
    const { mcap: mcapObj, activemcap: activemcapObj, defiactivetvl: defitvlObj } = record;

    const chains: PGCacheRecord['chains'] = {};
    let totalOnChainMcap = 0;
    let totalActiveMcap = 0;
    let totalDefiActiveTvl = 0;

    for (const [chainKey, value] of Object.entries(mcapObj)) {
      if (!chains[chainKey]) chains[chainKey] = { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0 };
      const numValue = Number(value) || 0;
      chains[chainKey].onChainMcap = numValue;
      totalOnChainMcap += numValue;
    }

    for (const [chainKey, value] of Object.entries(activemcapObj)) {
      if (!chains[chainKey]) chains[chainKey] = { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0 };
      const numValue = Number(value) || 0;
      chains[chainKey].activeMcap = numValue;
      totalActiveMcap += numValue;
    }

    for (const [chainKey, protocols] of Object.entries(defitvlObj)) {
      if (!chains[chainKey]) chains[chainKey] = { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0 };
      const numValue = sumObjectValues(protocols);
      chains[chainKey].defiActiveTvl = numValue;
      totalDefiActiveTvl += numValue;
    }

    data[record.timestamp] = {
      onChainMcap: totalOnChainMcap,
      activeMcap: totalActiveMcap,
      defiActiveTvl: totalDefiActiveTvl,
      chains,
    };
  }
  return data;
}

async function generatePGCache(): Promise<{ updatedIds: number }> {
  console.log('Generating PG cache with chain breakdown...');
  const startTime = Date.now();

  const syncMetadata = await getSyncMetadata();
  const lastSyncTimestamp = syncMetadata?.lastSyncTimestamp
    ? new Date(syncMetadata.lastSyncTimestamp)
    : undefined;

  let updatedIds = 0;

  if (lastSyncTimestamp) {
    // Incremental sync: fetch only updated records
    console.log(`Incremental PG cache sync: fetching records updated after ${lastSyncTimestamp.toISOString()}`);
    const records = await fetchDailyRecordsWithChainsPG(lastSyncTimestamp);
    console.log(`Fetched ${records.length} updated records for PG cache`);

    if (records.length === 0) {
      console.log('No new records for PG cache');
      return { updatedIds: 0 };
    }

    // Group by ID
    const recordsById: { [id: string]: any[] } = {};
    records.forEach((record) => {
      if (!recordsById[record.id]) recordsById[record.id] = [];
      recordsById[record.id].push(record);
    });

    for (const [id, idRecords] of Object.entries(recordsById)) {
      const existingCache = await readPGCacheForId(id);
      const newData = processRecordsToPGCache(idRecords);
      const merged = mergePGCacheData(existingCache, newData);
      await storePGCacheForId(id, merged);
      updatedIds++;
    }
  } else {
    // Full sync: fetch one ID at a time
    console.log('Full PG cache sync: fetching all records one ID at a time');
    const allIds = await fetchAllDailyIdsPG();
    console.log(`Found ${allIds.length} unique IDs to process`);

    for (let i = 0; i < allIds.length; i++) {
      const id = allIds[i];
      try {
        const records = await fetchDailyRecordsWithChainsForIdPG(id);
        if (records.length === 0) continue;

        const data = processRecordsToPGCache(records);
        await storePGCacheForId(id, data);
        updatedIds++;

        if ((i + 1) % 100 === 0) {
          console.log(`PG cache: processed ${i + 1}/${allIds.length} IDs`);
        }
      } catch (e) {
        console.error(`Error processing PG cache for ${id}:`, (e as any)?.message);
      }
    }
  }

  console.log(`Generated PG cache for ${updatedIds} IDs in ${Date.now() - startTime}ms`);
  return { updatedIds };
}

async function generateAggregateStats(currentData: any[]): Promise<any> {
  console.log('Generating aggregate stats...');
  const startTime = Date.now();

  let totals = {
    onChainMcap: 0,
    activeMcap: 0,
    defiActiveTvl: 0,
    assetCount: 0,
    assetIssuers: 0,
  }

  const byCategory: { [category: string]: { onChainMcap: number; activeMcap: number; defiActiveTvl: number; assetCount: number, assetIssuers: Set<string> } } = {};
  const byChain: {
    [chain: string]: {
      onChainMcap: number; activeMcap: number; defiActiveTvl: number, assetCount: number, assetIssuers: Set<string>, stablecoins: {
        onChainMcap: number; activeMcap: number; defiActiveTvl: number; assetCount: number, assetIssuers: Set<string>
      }, governance: {
        onChainMcap: number; activeMcap: number; defiActiveTvl: number; assetCount: number, assetIssuers: Set<string>
      }
    }
  } = {};
  const byPlatform: { [platform: string]: { onChainMcap: number; activeMcap: number; defiActiveTvl: number; assetCount: number, assetIssuers: Set<string> } } = {};

  function addToAggStats(item: any, value: string, aggObj: any) {
    if (!value) return;
    if (!aggObj[value]) {
      aggObj[value] = { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: new Set<string>() };
    }
    const aggItem = aggObj[value];
    aggItem.assetCount += 1;
    if (item.issuer) aggItem.assetIssuers.add(item.issuer)

    // Sum on-chain marketcap for this asset
    if (item.onChainMcap && typeof item.onChainMcap === 'object') {
      Object.values(item.onChainMcap).forEach((value) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          aggItem.onChainMcap += numValue;
        }
      });
    }

    // Sum activeMcap for this asset
    if (item.activeMcap && typeof item.activeMcap === 'object') {
      Object.values(item.activeMcap).forEach((value) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          aggItem.activeMcap += numValue;
        }
      });
    }

    // Sum defiActiveTvl for this asset
    if (item.defiActiveTvl && typeof item.defiActiveTvl === 'object') {
      aggItem.defiActiveTvl += sumNestedObjectValues(item.defiActiveTvl);
    }

  }

  function initByChainIfNeeded(chain: string) {
    if (!byChain[chain]) {
      byChain[chain] = {
        onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: new Set<string>(),
        stablecoins: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: new Set<string>() },
        governance: { onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0, assetCount: 0, assetIssuers: new Set<string>() }
      };
    }
  }

  for (const item of currentData) {
    // NOTE: current data uses camelCase field names:
    // - item.onChainMcap: { [chainLabel]: number-string }
    // - item.activeMcap: { [chainLabel]: number-string }
    // - item.defiActiveTvl: { [chainLabel]: { [protocol]: number-string } }
    const seenChainsForAsset = new Set<string>();
    const excludeFromChainOverall = Boolean(item.stablecoin || item.governance);

    totals.assetCount += 1;
    if (item.issuer) totals.assetIssuers += 1;

    // on-chain marketcap by chain
    if (item.onChainMcap && typeof item.onChainMcap === 'object') {
        for (const [chain, value] of Object.entries(item.onChainMcap)) {
        const numValue = Number(value);
        if (Number.isNaN(numValue)) continue;

        totals.onChainMcap += numValue;
        initByChainIfNeeded(chain);
        seenChainsForAsset.add(chain);

        // Chain "overall" should exclude stablecoin + governance assets
        if (!excludeFromChainOverall) byChain[chain].onChainMcap += numValue;
        if (item.stablecoin) byChain[chain].stablecoins.onChainMcap += numValue;
        if (item.governance) byChain[chain].governance.onChainMcap += numValue;
      };
    }

    // active mcap by chain
    if (item.activeMcap && typeof item.activeMcap === 'object') {
      for (const [chain, value] of Object.entries(item.activeMcap)) {
        const numValue = Number(value);
        if (Number.isNaN(numValue)) continue;

        totals.activeMcap += numValue;
        initByChainIfNeeded(chain);
        seenChainsForAsset.add(chain);

        // Chain "overall" should exclude stablecoin + governance assets
        if (!excludeFromChainOverall) byChain[chain].activeMcap += numValue;
        if (item.stablecoin) byChain[chain].stablecoins.activeMcap += numValue;
        if (item.governance) byChain[chain].governance.activeMcap += numValue;
      };
    }

    // defi active tvl by chain (nested object per chain)
    if (item.defiActiveTvl && typeof item.defiActiveTvl === 'object') {
      for (const [chain, protocols] of Object.entries(item.defiActiveTvl)) {
        const numValue = sumObjectValues(protocols);
        if (Number.isNaN(numValue)) continue;

        totals.defiActiveTvl += numValue;
        initByChainIfNeeded(chain);

        // Count asset towards this chain if it has any defiActiveTvl protocols there.
        seenChainsForAsset.add(chain);
        // Chain "overall" should exclude stablecoin + governance assets
        if (!excludeFromChainOverall) byChain[chain].defiActiveTvl += numValue;
        if (item.stablecoin) byChain[chain].stablecoins.defiActiveTvl += numValue;
        if (item.governance) byChain[chain].governance.defiActiveTvl += numValue;
      };
    }

    // Count assets per chain once (not once per metric)
    for (const chain of seenChainsForAsset) {
      initByChainIfNeeded(chain);
      // Chain "overall" should exclude stablecoin + governance assets
      if (!excludeFromChainOverall) {
        byChain[chain].assetCount += 1;
        if (item.issuer) byChain[chain].assetIssuers.add(item.issuer);
      }

      if (item.stablecoin) {
        byChain[chain].stablecoins.assetCount += 1;
        if (item.issuer) byChain[chain].stablecoins.assetIssuers.add(item.issuer);
      }

      if (item.governance) {
        byChain[chain].governance.assetCount += 1;
        if (item.issuer) byChain[chain].governance.assetIssuers.add(item.issuer);
      }
    }

    // Aggregate by category
    const categories = item.category || [];
    for (const cat of categories) {
      addToAggStats(item, cat, byCategory);
    }
    addToAggStats(item, item.parentPlatform, byPlatform);
  };

  function switchSetToCount(aggObj: any) {
    Object.values(aggObj).forEach((stats: any) => {
      stats.assetIssuers = stats.assetIssuers.size;

      if (stats.stablecoins)
        stats.stablecoins.assetIssuers = stats.stablecoins.assetIssuers.size;

      if (stats.governance)
        stats.governance.assetIssuers = stats.governance.assetIssuers.size;

    });
  }

  switchSetToCount(byCategory);
  switchSetToCount(byPlatform);
  switchSetToCount(byChain);

  const stats = {
    totalOnChainMcap: totals.onChainMcap,
    totalActiveMcap: totals.activeMcap,
    totalDefiActiveTvl: totals.defiActiveTvl,
    totalAssets: totals.assetCount,
    totalIssuers: totals.assetIssuers,
    byChain,
    byCategory,
    byPlatform,
  };

  console.log(`Generated aggregate stats in ${Date.now() - startTime}ms`);
  return stats;
}

function generateList(currentData: any[]): {
  tickers: string[];
  platforms: string[];
  chains: string[];
  categories: string[];
  idMap: { [name: string]: string };
} {
  console.log('Generating list data...');
  const startTime = Date.now();

  const tickerMcap: { [ticker: string]: number } = {};
  const platformMcap: { [platform: string]: number } = {};
  const chainMcap: { [chain: string]: number } = {};
  const categoryMcap: { [category: string]: number } = {};
  const idMap: { [ticker: string]: string } = {};

  currentData.forEach((item: any) => {
    // Calculate total on-chain marketcap for this asset
    let assetMcap = 0;
    if (item.onChainMcap && typeof item.onChainMcap === 'object') {
      Object.entries(item.onChainMcap).forEach(([chain, value]) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          assetMcap += numValue;
          // Aggregate chain on-chain marketcap
          chainMcap[chain] = (chainMcap[chain] || 0) + numValue;
        }
      });
    }

    // Aggregate ticker mcap
    if (item.ticker) {
      tickerMcap[item.ticker] = (tickerMcap[item.ticker] || 0) + assetMcap;
      idMap[item.ticker] = item.id;
    }

    // Aggregate platform mcap
    if (item.parentPlatform) {
      platformMcap[item.parentPlatform] = (platformMcap[item.parentPlatform] || 0) + assetMcap;
    }

    // Aggregate category mcap
    const categories = item.category || [];
    categories.forEach((cat: string) => {
      categoryMcap[cat] = (categoryMcap[cat] || 0) + assetMcap;
    });
  });

  // Sort by mcap descending and return as arrays of strings
  const sortByMcap = (obj: { [key: string]: number }): string[] =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);

  const list = {
    tickers: sortByMcap(tickerMcap),
    platforms: sortByMcap(platformMcap),
    chains: sortByMcap(chainMcap),
    categories: sortByMcap(categoryMcap),
    idMap,
  };

  console.log(`Generated list data in ${Date.now() - startTime}ms`);
  return list;
}

interface HistoricalDataPoint {
  timestamp: number;
  onChainMcap: number;
  activeMcap: number;
  defiActiveTvl: number;
}

async function generateAggregatedHistoricalCharts(metadata: RWAMetadata[]): Promise<void> {
  console.log('Generating aggregated historical charts...');
  const startTime = Date.now();

  // Aggregation maps: key -> timestamp -> values
  const byChain: { [chain: string]: { [timestamp: number]: HistoricalDataPoint } } = {};
  const byCategory: { [category: string]: { [timestamp: number]: HistoricalDataPoint } } = {};
  const byPlatform: { [platform: string]: { [timestamp: number]: HistoricalDataPoint } } = {};

  function ensureDataPoint(map: { [key: string]: { [timestamp: number]: HistoricalDataPoint } }, key: string, timestamp: number): HistoricalDataPoint {
    if (!map[key]) map[key] = {};
    if (!map[key][timestamp]) map[key][timestamp] = { timestamp, onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0 };
    return map[key][timestamp];
  }

  // Process each asset's pg-cache for chain breakdown
  let processedCount = 0;
  for (const m of metadata) {
    const pgCache = await readPGCacheForId(m.id);
    if (!pgCache) continue;

    const categories = m.data.category || [];
    const platform = m.data.parentPlatform;

    for (const [timestampStr, record] of Object.entries(pgCache)) {
      const timestamp = Number(timestampStr);
      const { onChainMcap: totalOnChainMcap, activeMcap: totalActiveMcap, defiActiveTvl: totalTvl, chains } = record;

      // Aggregate by individual chains (using chain keys)
      for (const [chainKey, chainData] of Object.entries(chains)) {
        const chainDp = ensureDataPoint(byChain, chainKey, timestamp);
        chainDp.onChainMcap += chainData.onChainMcap || 0;
        chainDp.activeMcap += chainData.activeMcap || 0;
        chainDp.defiActiveTvl += chainData.defiActiveTvl || 0;
      }

      // Aggregate to "All"
      const allDp = ensureDataPoint(byChain, 'all', timestamp);
      allDp.onChainMcap += totalOnChainMcap;
      allDp.activeMcap += totalActiveMcap;
      allDp.defiActiveTvl += totalTvl;

      // Aggregate by category
      for (const cat of categories) {
        const dp = ensureDataPoint(byCategory, cat, timestamp);
        dp.onChainMcap += totalOnChainMcap;
        dp.activeMcap += totalActiveMcap;
        dp.defiActiveTvl += totalTvl;
      }

      // Aggregate by platform
      if (platform) {
        const dp = ensureDataPoint(byPlatform, platform, timestamp);
        dp.onChainMcap += totalOnChainMcap;
        dp.activeMcap += totalActiveMcap;
        dp.defiActiveTvl += totalTvl;
      }
    }
    processedCount++;
  }

  // Convert to sorted arrays and store
  function toSortedArray(map: { [timestamp: number]: HistoricalDataPoint }): HistoricalDataPoint[] {
    return Object.values(map).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Store chain charts (includes "All" and individual chains)
  for (const [chain, timestampMap] of Object.entries(byChain)) {
    await storeRouteData(`charts/chain/${chain}.json`, { data: toSortedArray(timestampMap) });
  }

  // Store category charts
  for (const [category, timestampMap] of Object.entries(byCategory)) {
    await storeRouteData(`charts/category/${category}.json`, { data: toSortedArray(timestampMap) });
  }

  // Store platform charts
  for (const [platform, timestampMap] of Object.entries(byPlatform)) {
    await storeRouteData(`charts/platform/${platform}.json`, { data: toSortedArray(timestampMap) });
  }

  console.log(`Generated aggregated historical charts in ${Date.now() - startTime}ms`);
  console.log(`  Processed ${processedCount} assets. Chains: ${Object.keys(byChain).length}, Categories: ${Object.keys(byCategory).length}, Platforms: ${Object.keys(byPlatform).length}`);
}

async function main() {
  console.log('='.repeat(60));
  console.log('RWA Cron Job Started:', new Date().toISOString());
  console.log('Cache Version:', getCacheVersion());
  console.log('='.repeat(60));

  const totalStartTime = Date.now();

  try {
    // Clear old cache versions
    console.log('Clearing old cache versions...');
    await clearOldCacheVersions();

    // Initialize database connection
    console.log('Initializing database connection...');
    await initPG();

    // Get metadata for ID map and historical generation
    const metadata = await fetchMetadataPG();

    // Generate current data
    const { data: currentData, timestamp } = await generateCurrentData(metadata);

    // Store current data
    console.log('Storing current data...');
    await storeRouteData('current.json', { data: currentData, timestamp });


    // Generate and store ID map
    console.log('Generating ID map...');
    const idMap = generateIdMap(metadata);
    await storeRouteData('id-map.json', idMap);

    // Generate aggregate stats
    const stats = await generateAggregateStats(currentData);
    await storeRouteData('stats.json', stats);

    // Generate historical data incrementally
    const { updatedIds, totalRecords } = await generateAllHistoricalDataIncremental();
    console.log(`Historical data: updated ${updatedIds} IDs with ${totalRecords} records`);

    // Generate PG cache with chain breakdown
    await generatePGCache();

    // Generate aggregated historical charts by chain, category, platform
    await generateAggregatedHistoricalCharts(metadata);

    // Generate lists of tickers, platforms, chains, categories sorted by mcap
    const list = generateList(currentData);
    await storeRouteData('list.json', list);

    console.log('='.repeat(60));
    console.log(`RWA Cron Job Completed in ${Date.now() - totalStartTime}ms`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error in RWA cron job:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

// Run with: npx ts-node defi/src/rwa/cron.ts
