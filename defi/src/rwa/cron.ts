require("dotenv").config();

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
  getPGSyncMetadata,
  setPGSyncMetadata,
} from './file-cache';
import { initPG, fetchCurrentPG, fetchMetadataPG, fetchAllDailyRecordsPG, fetchMaxUpdatedAtPG, fetchAllDailyIdsPG, fetchDailyRecordsForIdPG, fetchDailyRecordsWithChainsPG, fetchDailyRecordsWithChainsForIdPG } from './db';

import { rwaSlug, toFiniteNumberOrZero } from './utils';
import { parentProtocolsById } from '../protocols/parentProtocols';
import { protocolsById } from '../protocols/data';
import { getChainLabelFromKey } from '../utils/normalizeChain';

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
    const chainLabel = getChainLabelFromKey(chainKey);
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
    const chainLabel = getChainLabelFromKey(chainKey);
    const protocols = obj[chainKey];
    const outProtocols: { [key: string]: number } = {};
    if (protocols && typeof protocols === 'object') {
      for (const [protocolKey, value] of Object.entries(protocols)) {
        const isTreasury = protocolKey.endsWith('-treasury');
        const normalizedProtocolKey = isTreasury ? protocolKey.slice(0, -'-treasury'.length) : protocolKey;
        const protocolLabel = (normalizedProtocolKey.startsWith('parent#') ? parentProtocolsById[protocolKey]?.name : protocolsById[protocolKey]?.name) ?? protocolKey;
        const finalProtocolLabel = isTreasury ? `${protocolLabel} (Treasury)` : protocolLabel;
        outProtocols[finalProtocolLabel] = toFiniteNumberOrZero(value);
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

async function generateCurrentData(metadata: RWAMetadata[]): Promise<any[]> {
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

    // Expose camelCase fields in API responses; do not expose "mcap" (use "onChainMcap" instead).
    delete (m.data as any).mcap;
    m.data.onChainMcap = convertChainKeysToLabelsNumber(idCurrent.mcap as any);
    if (m.data.activeMcapData) m.data.activeMcap = convertChainKeysToLabelsNumber(idCurrent.activemcap as any);
    m.data.defiActiveTvl = convertChainKeysToLabelsNestedNumber(idCurrent.defiactivetvl as any);

    data.push(m.data);
  });

  console.log(`Generated current data in ${Date.now() - startTime}ms`);
  return data;
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

async function generateAllHistoricalDataIncremental(metadata: RWAMetadata[]): Promise<{ updatedIds: number; totalRecords: number }> {
  console.log('Generating historical data incrementally...');
  const startTime = Date.now();

  // Create a map of id -> activeMcapData for quick lookup
  const activeMcapDataMap: { [id: string]: boolean } = {};
  metadata.forEach((m) => {
    activeMcapDataMap[m.id] = !!m.data.activeMcapData;
  });

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
      const activeMcapData = activeMcapDataMap[record.id] ?? false;
      recordsById[record.id].push({
        timestamp: record.timestamp,
        // Sequelize returns DECIMAL as string; normalize to numbers for API consumers
        onChainMcap: toFiniteNumberOrZero(record.aggregatemcap),
        defiActiveTvl: toFiniteNumberOrZero(record.aggregatedefiactivetvl),
        activeMcap: activeMcapData ? toFiniteNumberOrZero(record.aggregatedactivemcap) : undefined,
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

        const activeMcapData = activeMcapDataMap[id] ?? false;
        const historicalData = records.map((record) => ({
          timestamp: record.timestamp,
          // Sequelize returns DECIMAL as string; normalize to numbers for API consumers
          onChainMcap: toFiniteNumberOrZero(record.aggregatemcap),
          defiActiveTvl: toFiniteNumberOrZero(record.aggregatedefiactivetvl),
          activeMcap: activeMcapData ? toFiniteNumberOrZero(record.aggregatedactivemcap) : undefined,
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

  const syncMetadata = await getPGSyncMetadata();
  const lastSyncTimestamp = syncMetadata?.lastSyncTimestamp
    ? new Date(syncMetadata.lastSyncTimestamp)
    : undefined;
  const timeNow = new Date()

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
  

  // Update sync metadata
  setPGSyncMetadata({
    lastSyncTimestamp: timeNow.toISOString(),
    lastSyncDate: timeNow.toISOString(),
    totalIds: updatedIds,
  })

  console.log(`Generated PG cache for ${updatedIds} IDs in ${Date.now() - startTime}ms`);
  return { updatedIds };
}

type AggregateStatsBucket = {
  onChainMcap: number;
  activeMcap: number;
  defiActiveTvl: number;
  assetCount: number;
  assetIssuers: number;
};

// For chain buckets we need issuer identity (not a non-additive count),
// because the frontend may union issuer sets across multiple disjoint buckets.
type AggregateStatsBucketWithIssuers = Omit<AggregateStatsBucket, "assetIssuers"> & {
  assetIssuers: string[];
};

/**
 * Chain buckets are DISJOINT so the UI can sum without double-counting.
 *
 * Frontend toggle computation:
 * - both off: base
 * - stable on only: base + stablecoinsOnly + stablecoinsAndGovernance
 * - gov on only: base + governanceOnly + stablecoinsAndGovernance
 * - both on: base + stablecoinsOnly + governanceOnly + stablecoinsAndGovernance
 */
type AggregateStatsChainBucket = {
  base: AggregateStatsBucketWithIssuers;
  stablecoinsOnly: AggregateStatsBucketWithIssuers;
  governanceOnly: AggregateStatsBucketWithIssuers;
  stablecoinsAndGovernance: AggregateStatsBucketWithIssuers; // intersection (stablecoin && governance)
};

type AggregateStats = {
  totalOnChainMcap: number;
  totalActiveMcap: number;
  totalDefiActiveTvl: number;
  assetCount: number;
  assetIssuers: number;
  byCategory: { [category: string]: AggregateStatsBucket };
  byChain: { [chain: string]: AggregateStatsChainBucket };
  byPlatform: { [platform: string]: AggregateStatsBucket };
};

type AggregateStatsBucketInternal = {
  onChainMcap: number;
  activeMcap: number;
  defiActiveTvl: number;
  assetCount: number;
  assetIssuers: Set<string>;
};

function generateAggregateStats(currentData: any[]): AggregateStats {
  console.log("Generating aggregate stats...");
  const startTime = Date.now();

  const makeAgg = (): AggregateStatsBucketInternal => ({
    onChainMcap: 0,
    activeMcap: 0,
    defiActiveTvl: 0,
    assetCount: 0,
    assetIssuers: new Set<string>(),
  });

  const addToAgg = (
    agg: AggregateStatsBucketInternal,
    delta: { onChainMcap: any; activeMcap: any; defiActiveTvl: any },
    issuer: string | null | undefined
  ) => {
    agg.onChainMcap += toFiniteNumberOrZero(delta.onChainMcap);
    agg.activeMcap += toFiniteNumberOrZero(delta.activeMcap);
    agg.defiActiveTvl += toFiniteNumberOrZero(delta.defiActiveTvl);
    agg.assetCount += 1;
    if (issuer) agg.assetIssuers.add(issuer);
  };

  const sumNumberMap = (obj: any): number => {
    if (!obj || typeof obj !== "object") return 0;
    if (Array.isArray((obj as any).breakdown)) {
      return (obj as any).breakdown.reduce((acc: number, entry: any) => {
        if (!Array.isArray(entry) || entry.length < 2) return acc;
        return acc + toFiniteNumberOrZero(entry[1]);
      }, 0);
    }
    return Object.entries(obj).reduce((acc, [k, v]) => {
      if (k === "total" || k === "breakdown") return acc;
      return acc + toFiniteNumberOrZero(v);
    }, 0);
  };

  const normalizeNumberMap = (obj: any): { [key: string]: number } => {
    const out: { [key: string]: number } = {};
    if (!obj || typeof obj !== "object") return out;

    // Support API-shaped { total, breakdown: [[key, value], ...] }
    if (Array.isArray((obj as any).breakdown)) {
      for (const entry of (obj as any).breakdown) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const key = String(entry[0]);
        out[key] = (out[key] || 0) + toFiniteNumberOrZero(entry[1]);
      }
      return out;
    }

    // Standard map-shaped { [key]: number }
    for (const [k, v] of Object.entries(obj)) {
      if (k === "total" || k === "breakdown") continue;
      out[k] = (out[k] || 0) + toFiniteNumberOrZero(v);
    }
    return out;
  };

  const normalizeNestedNumberMap = (obj: any): { [chain: string]: { [protocol: string]: number } } => {
    const out: { [chain: string]: { [protocol: string]: number } } = {};
    if (!obj || typeof obj !== "object") return out;

    // If this is the chain-filtered API output { total, breakdown }, we can't recover the chain key here.
    if (Array.isArray((obj as any).breakdown)) return out;

    for (const [chain, protocols] of Object.entries(obj)) {
      if (!protocols || typeof protocols !== "object") continue;
      const inner: { [protocol: string]: number } = {};
      for (const [p, v] of Object.entries(protocols as any)) {
        inner[p] = (inner[p] || 0) + toFiniteNumberOrZero(v);
      }
      out[chain] = inner;
    }
    return out;
  };

  const sumProtocolMap = (obj: any): number => {
    if (!obj || typeof obj !== "object") return 0;
    let total = 0;
    for (const v of Object.values(obj as any)) {
      total += toFiniteNumberOrZero(v);
    }
    return total;
  };

  const byCategory: { [category: string]: AggregateStatsBucketInternal } = {};
  const byChain: {
    [chain: string]: {
      base: AggregateStatsBucketInternal;
      stablecoinsOnly: AggregateStatsBucketInternal;
      governanceOnly: AggregateStatsBucketInternal;
      stablecoinsAndGovernance: AggregateStatsBucketInternal;
    };
  } = {};

  const byPlatform: { [platform: string]: AggregateStatsBucketInternal } = {};

  let totalOnChainMcap = 0;
  let totalActiveMcap = 0;
  let totalDefiActiveTvl = 0;
  let assetCount = 0;
  const allIssuers = new Set<string>();

  for (const item of currentData || []) {
    if (!item || typeof item !== "object") continue;

    const assetType = typeof item.type === "string" ? item.type.trim() : "";
    if (assetType.toLowerCase() === "wrapper") continue;

    assetCount += 1;

    const issuer: string | null = typeof item.issuer === "string" && item.issuer.trim() ? item.issuer.trim() : null;
    if (issuer) allIssuers.add(issuer);

    const stablecoin = item.stablecoin === true;
    const governance = item.governance === true;

    const onChainMcapByChain = normalizeNumberMap(item.onChainMcap);
    const activeMcapByChain = normalizeNumberMap(item.activeMcap);
    const defiActiveTvlByChain = normalizeNestedNumberMap(item.defiActiveTvl);

    const assetOnChainTotal = sumNumberMap(onChainMcapByChain);
    const assetActiveTotal = sumNumberMap(activeMcapByChain);
    const assetDefiActiveTotal = Object.values(defiActiveTvlByChain).reduce(
      (acc, protocols) => acc + sumProtocolMap(protocols),
      0
    );

    totalOnChainMcap += assetOnChainTotal;
    totalActiveMcap += assetActiveTotal;
    totalDefiActiveTvl += assetDefiActiveTotal;

    // Category aggregation (note: assets can have multiple categories; totals may exceed global totals)
    const categories: string[] = Array.isArray(item.category) ? item.category : [];
    for (const cat of categories) {
      if (!cat) continue;
      if (!byCategory[cat]) byCategory[cat] = makeAgg();
      addToAgg(
        byCategory[cat],
        {
          onChainMcap: assetOnChainTotal,
          activeMcap: assetActiveTotal,
          defiActiveTvl: assetDefiActiveTotal,
        },
        issuer
      );
    }

    // Platform aggregation (ONLY when asset has a valid parentPlatform; never synthesize "Unknown")
    const platform =
      typeof item.parentPlatform === "string" && item.parentPlatform.trim() ? item.parentPlatform.trim() : null;
    if (platform && platform !== "Unknown") {
      if (!byPlatform[platform]) byPlatform[platform] = makeAgg();
      addToAgg(
        byPlatform[platform],
        {
          onChainMcap: assetOnChainTotal,
          activeMcap: assetActiveTotal,
          defiActiveTvl: assetDefiActiveTotal,
        },
        issuer
      );
    }

    // Chain aggregation + stablecoin/governance subgroups
    const chains = new Set<string>([
      ...Object.keys(onChainMcapByChain || {}),
      ...Object.keys(activeMcapByChain || {}),
      ...Object.keys(defiActiveTvlByChain || {}),
    ]);

    for (const chain of chains) {
      if (!chain) continue;
      const onChain = toFiniteNumberOrZero(onChainMcapByChain?.[chain]);
      const active = toFiniteNumberOrZero(activeMcapByChain?.[chain]);
      const tvl = sumProtocolMap(defiActiveTvlByChain?.[chain]);

      if (!byChain[chain]) {
        byChain[chain] = {
          base: makeAgg(),
          stablecoinsOnly: makeAgg(),
          governanceOnly: makeAgg(),
          stablecoinsAndGovernance: makeAgg(),
        };
      }

      const chainAgg = byChain[chain];

      // Disjoint buckets for UI toggles without double-counting:
      // - base excludes stablecoins & governance by default
      if (stablecoin && governance) {
        addToAgg(
          chainAgg.stablecoinsAndGovernance,
          { onChainMcap: onChain, activeMcap: active, defiActiveTvl: tvl },
          issuer
        );
      } else if (stablecoin) {
        addToAgg(chainAgg.stablecoinsOnly, { onChainMcap: onChain, activeMcap: active, defiActiveTvl: tvl }, issuer);
      } else if (governance) {
        addToAgg(chainAgg.governanceOnly, { onChainMcap: onChain, activeMcap: active, defiActiveTvl: tvl }, issuer);
      } else {
        addToAgg(chainAgg.base, { onChainMcap: onChain, activeMcap: active, defiActiveTvl: tvl }, issuer);
      }
    }
  }

  const outByCategory: { [category: string]: AggregateStatsBucket } = {};
  for (const [k, v] of Object.entries(byCategory)) {
    outByCategory[k] = {
      onChainMcap: v.onChainMcap,
      activeMcap: v.activeMcap,
      defiActiveTvl: v.defiActiveTvl,
      assetCount: v.assetCount,
      assetIssuers: v.assetIssuers.size,
    };
  }

  const outByPlatform: { [platform: string]: AggregateStatsBucket } = {};
  for (const [k, v] of Object.entries(byPlatform)) {
    outByPlatform[k] = {
      onChainMcap: v.onChainMcap,
      activeMcap: v.activeMcap,
      defiActiveTvl: v.defiActiveTvl,
      assetCount: v.assetCount,
      assetIssuers: v.assetIssuers.size,
    };
  }

  const outByChain: { [chain: string]: AggregateStatsChainBucket } = {};

  for (const [chain, v] of Object.entries(byChain)) {
    const toAggOut = (a: AggregateStatsBucketInternal): AggregateStatsBucketWithIssuers => ({
      onChainMcap: a.onChainMcap,
      activeMcap: a.activeMcap,
      defiActiveTvl: a.defiActiveTvl,
      assetCount: a.assetCount,
      assetIssuers: Array.from(a.assetIssuers).sort(),
    });

    outByChain[chain] = {
      base: toAggOut(v.base),
      stablecoinsOnly: toAggOut(v.stablecoinsOnly),
      governanceOnly: toAggOut(v.governanceOnly),
      stablecoinsAndGovernance: toAggOut(v.stablecoinsAndGovernance),
    };
  }

  console.log(`Generated aggregate stats in ${Date.now() - startTime}ms`);

  return {
    totalOnChainMcap,
    totalActiveMcap,
    totalDefiActiveTvl,
    assetCount,
    assetIssuers: allIssuers.size,
    byCategory: outByCategory,
    byChain: outByChain,
    byPlatform: outByPlatform,
  };
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

    // Aggregate platform mcap (ONLY when asset has a valid parentPlatform; never include "Unknown")
    const parentPlatform =
      typeof item.parentPlatform === "string" && item.parentPlatform.trim() ? item.parentPlatform.trim() : null;
    if (parentPlatform && parentPlatform !== "Unknown") {
      platformMcap[parentPlatform] = (platformMcap[parentPlatform] || 0) + assetMcap;
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

interface HistoricalBreakdownDataPoint {
  onChainMcap: any;
  activeMcap: any;
  defiActiveTvl: any;
}

async function generateAggregatedHistoricalCharts(metadata: RWAMetadata[]): Promise<void> {
  console.log('Generating aggregated historical charts...');
  const startTime = Date.now();

  // Aggregation maps: key -> timestamp -> values
  const byChain: { [chain: string]: { [timestamp: number]: HistoricalDataPoint } } = {};
  const byCategory: { [category: string]: { [timestamp: number]: HistoricalDataPoint } } = {};
  const byPlatform: { [platform: string]: { [timestamp: number]: HistoricalDataPoint } } = {};

  // breakdown by asset
  const byChainTickerBreakdown: { [category: string]: HistoricalBreakdownDataPoint } = {};
  const byCategoryTickerBreakdown: { [category: string]: HistoricalBreakdownDataPoint } = {};
  const byPlatformTickerBreakdown: { [category: string]: HistoricalBreakdownDataPoint } = {};
  
  function ensureDataPoint(map: { [key: string]: { [timestamp: number]: HistoricalDataPoint } }, key: string, timestamp: number): HistoricalDataPoint {
    if (!map[key]) map[key] = {};
    if (!map[key][timestamp]) map[key][timestamp] = { timestamp, onChainMcap: 0, activeMcap: 0, defiActiveTvl: 0 };
    return map[key][timestamp];
  }

  function ensureBreakdownDataPoint(map: { [category: string]: HistoricalBreakdownDataPoint }, key: string, timestamp: number, ticker: string): HistoricalBreakdownDataPoint {
    if (!map[key]) map[key] = { onChainMcap: {}, activeMcap: {}, defiActiveTvl: {} };
    
    map[key].onChainMcap[timestamp] = map[key].onChainMcap[timestamp] || {};
    map[key].activeMcap[timestamp] = map[key].activeMcap[timestamp] || {};
    map[key].defiActiveTvl[timestamp] = map[key].defiActiveTvl[timestamp] || {};
    
    map[key].onChainMcap[timestamp][ticker] = map[key].onChainMcap[timestamp][ticker] || 0;
    map[key].activeMcap[timestamp][ticker] = map[key].activeMcap[timestamp][ticker] || 0;
    map[key].defiActiveTvl[timestamp][ticker] = map[key].defiActiveTvl[timestamp][ticker] || 0;
    
    return map[key];
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
      // Defensive: pg-cache *should* be numeric, but if any legacy cache has strings
      // we must coerce before using `+=` (otherwise JS turns it into string concatenation).
      const {
        onChainMcap: rawTotalOnChainMcap,
        activeMcap: rawTotalActiveMcap,
        defiActiveTvl: rawTotalTvl,
        chains,
      } = record as any;
      const ticker = m.data.ticker;

      const totalOnChainMcap = toFiniteNumberOrZero(rawTotalOnChainMcap);
      const totalActiveMcap = toFiniteNumberOrZero(rawTotalActiveMcap);
      const totalTvl = toFiniteNumberOrZero(rawTotalTvl);

      // Aggregate by individual chains (using chain keys)
      for (const [chainKey, chainData] of Object.entries(chains || {})) {
        const chainDp = ensureDataPoint(byChain, chainKey, timestamp);
        chainDp.onChainMcap += toFiniteNumberOrZero((chainData as any)?.onChainMcap);
        chainDp.activeMcap += toFiniteNumberOrZero((chainData as any)?.activeMcap);
        chainDp.defiActiveTvl += toFiniteNumberOrZero((chainData as any)?.defiActiveTvl);
        
        const dpa = ensureBreakdownDataPoint(byChainTickerBreakdown, chainKey, timestamp, ticker);
        dpa.onChainMcap[timestamp][ticker] += toFiniteNumberOrZero((chainData as any)?.onChainMcap);
        dpa.activeMcap[timestamp][ticker] += toFiniteNumberOrZero((chainData as any)?.activeMcap);
        dpa.defiActiveTvl[timestamp][ticker] += toFiniteNumberOrZero((chainData as any)?.defiActiveTvl);
      }

      // Aggregate to "All"
      const allDp = ensureDataPoint(byChain, 'all', timestamp);
      allDp.onChainMcap += totalOnChainMcap;
      allDp.activeMcap += totalActiveMcap;
      allDp.defiActiveTvl += totalTvl;
      
      const allDpa = ensureBreakdownDataPoint(byChainTickerBreakdown, 'all', timestamp, ticker);
      allDpa.onChainMcap[timestamp][ticker] += totalOnChainMcap;
      allDpa.activeMcap[timestamp][ticker] += totalActiveMcap;
      allDpa.defiActiveTvl[timestamp][ticker] += totalTvl;

      // Aggregate by category
      for (const cat of categories) {
        const dp = ensureDataPoint(byCategory, cat, timestamp);
        dp.onChainMcap += totalOnChainMcap;
        dp.activeMcap += totalActiveMcap;
        dp.defiActiveTvl += totalTvl;
        
        const dpa = ensureBreakdownDataPoint(byCategoryTickerBreakdown, cat, timestamp, ticker);
        dpa.onChainMcap[timestamp][ticker] += totalOnChainMcap;
        dpa.activeMcap[timestamp][ticker] += totalActiveMcap;
        dpa.defiActiveTvl[timestamp][ticker] += totalTvl;
      }

      // Aggregate by platform
      if (platform) {
        const dp = ensureDataPoint(byPlatform, platform, timestamp);
        dp.onChainMcap += totalOnChainMcap;
        dp.activeMcap += totalActiveMcap;
        dp.defiActiveTvl += totalTvl;
        
        const dpa = ensureBreakdownDataPoint(byPlatformTickerBreakdown, platform, timestamp, ticker);
        dpa.onChainMcap[timestamp][ticker] += totalOnChainMcap;
        dpa.activeMcap[timestamp][ticker] += totalActiveMcap;
        dpa.defiActiveTvl[timestamp][ticker] += totalTvl;
      }
    }
    processedCount++;
  }

  // Convert to sorted arrays and store
  function toSortedArray(map: { [timestamp: number]: HistoricalDataPoint }): HistoricalDataPoint[] {
    return Object.values(map)
      .map((dp) => ({
        timestamp: toFiniteNumberOrZero(dp.timestamp),
        onChainMcap: toFiniteNumberOrZero(dp.onChainMcap),
        activeMcap: toFiniteNumberOrZero(dp.activeMcap),
        defiActiveTvl: toFiniteNumberOrZero(dp.defiActiveTvl),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
  
  function toSortedArrayBreakdown(map: { [timestamp: string]: any }): any[] {
    return Object.keys(map)
      .map((timestamp: string) => ({
        timestamp: toFiniteNumberOrZero(timestamp),
        ...map[timestamp],
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Store chain charts (includes "All" and individual chains)
  for (const [chain, timestampMap] of Object.entries(byChain)) {
    const chainLabel = getChainLabelFromKey(chain);
    const key = rwaSlug(chainLabel);
    await storeRouteData(`charts/chain/${key}.json`, toSortedArray(timestampMap));
  }
  
  // Store chain charts - breakdown by tickers
  for (const [chain, dataMap] of Object.entries(byChainTickerBreakdown)) {
    const chainLabel = getChainLabelFromKey(chain);
    const key = rwaSlug(chainLabel);
    await storeRouteData(`charts/chain-ticker-breakdown/${key}.json`, {
      onChainMcap: toSortedArrayBreakdown(dataMap.onChainMcap),
      activeMcap: toSortedArrayBreakdown(dataMap.activeMcap),
      defiActiveTvl: toSortedArrayBreakdown(dataMap.defiActiveTvl),
    });
  }

  // Store category charts
  for (const [category, timestampMap] of Object.entries(byCategory)) {
    const key = rwaSlug(category);
    await storeRouteData(`charts/category/${key}.json`, toSortedArray(timestampMap));
  }
  
  // Store category charts - breakdown by tickers
  for (const [category, dataMap] of Object.entries(byCategoryTickerBreakdown)) {
    const key = rwaSlug(category);
    await storeRouteData(`charts/category-ticker-breakdown/${key}.json`, {
      onChainMcap: toSortedArrayBreakdown(dataMap.onChainMcap),
      activeMcap: toSortedArrayBreakdown(dataMap.activeMcap),
      defiActiveTvl: toSortedArrayBreakdown(dataMap.defiActiveTvl),
    });
  }

  // Store platform charts
  for (const [platform, timestampMap] of Object.entries(byPlatform)) {
    const key = rwaSlug(platform);
    await storeRouteData(`charts/platform/${key}.json`, toSortedArray(timestampMap));
  }
  
  // Store platform charts - breakdown by tickers
  for (const [platform, dataMap] of Object.entries(byPlatformTickerBreakdown)) {
    const key = rwaSlug(platform);
    await storeRouteData(`charts/platform-ticker-breakdown/${key}.json`, {
      onChainMcap: toSortedArrayBreakdown(dataMap.onChainMcap),
      activeMcap: toSortedArrayBreakdown(dataMap.activeMcap),
      defiActiveTvl: toSortedArrayBreakdown(dataMap.defiActiveTvl),
    });
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
    console.log(`Fetched metadata for ${metadata.length} RWA assets`);

    // Generate current data
    const currentData = await generateCurrentData(metadata);

    // Store current data
    if (currentData.length > 0) {
      console.log(`Storing current data for ${currentData.length} assets...`);
      await storeRouteData('current.json', currentData);
    } else {
      console.log("No current data to store");
    }

    // Generate and store ID map
    console.log('Generating ID map...');
    const idMap = generateIdMap(metadata);
    await storeRouteData('id-map.json', idMap);

    // Generate aggregate stats
    const stats = generateAggregateStats(currentData);
    await storeRouteData('stats.json', stats);

    // Generate historical data incrementally
    const { updatedIds, totalRecords } = await generateAllHistoricalDataIncremental(metadata);
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
