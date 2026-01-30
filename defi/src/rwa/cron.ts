import {
  storeRouteData,
  clearOldCacheVersions,
  getCacheVersion,
  getSyncMetadata,
  setSyncMetadata,
  storeHistoricalDataForId,
  readHistoricalDataForId,
  mergeHistoricalData,
} from './file-cache';
import { initPG, fetchCurrentPG, fetchMetadataPG, fetchAllDailyRecordsPG, fetchMaxUpdatedAtPG, fetchAllDailyIdsPG, fetchDailyRecordsForIdPG } from './db';

import * as sdk from '@defillama/sdk';

interface RWACurrentData {
  id: string;
  timestamp: number;
  defiactivetvl: object;
  mcap: object;
  activemcap: object;
}

// Convert chain keys to chain labels in an object
function convertChainKeysToLabels(obj: { [chainKey: string]: any }): { [chainLabel: string]: any } {
  const result: { [chainLabel: string]: any } = {};
  for (const chainKey of Object.keys(obj)) {
    const chainLabel = sdk.chainUtils.getChainLabelFromKey(chainKey);
    result[chainLabel] = obj[chainKey];
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

    Object.keys(idCurrent).forEach((key: string) => {
      if (key === 'timestamp' && idCurrent[key] > timestamp) {
        timestamp = idCurrent[key];
      } else if (['defiactivetvl', 'mcap', 'activemcap'].includes(key)) {
        m.data[key] = convertChainKeysToLabels((idCurrent as any)[key]);
      }
    });

    data.push(m.data);
  });

  console.log(`Generated current data in ${Date.now() - startTime}ms`);
  return { data, timestamp };
}

async function generateIdMap(metadata: RWAMetadata[]): Promise<{ [name: string]: string }> {
  const idMap: { [name: string]: string } = {};

  metadata.forEach((m: RWAMetadata) => {
    if (m.data.ticker) {
      idMap[m.data.ticker] = m.id;
    }
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
        onChainMarketcap: record.aggregatemcap,
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
        const mergedData = await mergeHistoricalData(existingData, newRecords);
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
          onChainMarketcap: record.aggregatemcap,
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

async function generateAggregateStats(currentData: any[]): Promise<any> {
  console.log('Generating aggregate stats...');
  const startTime = Date.now();

  let totals = {
    mcap: 0,
    activeMcap: 0,
    defiActiveTvl: 0,
  }

  const byCategory: { [category: string]: { mcap: number; activeMcap: number; defiActiveTvl: number; assetsCount: number, assetIssuers: Set<string> } } = {};
  const byChain: {
    [chain: string]: {
      mcap: number; activeMcap: number; defiActiveTvl: number, assetsCount: number, assetIssuers: Set<string>, stablecoins: {
        mcap: number; activeMcap: number; defiActiveTvl: number; assetsCount: number, assetIssuers: Set<string>
      }, governance: {
        mcap: number; activeMcap: number; defiActiveTvl: number; assetsCount: number, assetIssuers: Set<string>
      }
    }
  } = {};
  const byPlatform: { [platform: string]: { mcap: number; activeMcap: number; defiActiveTvl: number; assetsCount: number, assetIssuers: Set<string> } } = {};

  function addToAggStats(item: any, value: string, aggObj: any) {
    if (!value) return;
    if (!aggObj[value]) {
      aggObj[value] = { mcap: 0, activeMcap: 0, defiActiveTvl: 0, assetsCount: 0, assetIssuers: new Set<string>() };
    }
    const aggItem = aggObj[value];
    aggObj[value].assetsCount += 1;

    aggItem.assetsCount += 1;
    if (item.issuer) aggItem.assetIssuers.add(item.issuer)

    // Sum mcap for this asset
    if (item.mcap && typeof item.mcap === 'object') {
      Object.values(item.mcap).forEach((value) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          aggItem.mcap += numValue;
        }
      });
    }

    // Sum activeMcap for this asset
    if (item.activemcap && typeof item.activemcap === 'object') {
      Object.values(item.activemcap).forEach((value) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          aggItem.activeMcap += numValue;
        }
      });
    }

    // Sum defiActiveTvl for this asset
    if (item.defiactivetvl && typeof item.defiactivetvl === 'object') {
      Object.values(item.defiactivetvl).forEach((protocols) => {
        if (protocols && typeof protocols === 'object') {
          Object.values(protocols as { [key: string]: string }).forEach((value) => {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              aggItem.defiActiveTvl += numValue;
            }
          });
        }
      });
    }

  }

  function initByChainIfNeeded(chain: string) {
    if (!byChain[chain]) {
      byChain[chain] = {
        mcap: 0, activeMcap: 0, defiActiveTvl: 0, assetsCount: 0, assetIssuers: new Set<string>(),
        stablecoins: { mcap: 0, activeMcap: 0, defiActiveTvl: 0, assetsCount: 0, assetIssuers: new Set<string>() },
        governance: { mcap: 0, activeMcap: 0, defiActiveTvl: 0, assetsCount: 0, assetIssuers: new Set<string>() }
      };
    }
  }

  const keyMap = {
    mcap: 'mcap',
    activeMcap: 'activeMcap',
    defiActiveTvl: 'defiActiveTvl',
  }

  currentData.forEach((item: any) => {

    Object.entries(keyMap).forEach(([key, mappedKey]) => {
      if (item[key] && typeof item[key] === 'object') {
        Object.entries(item[key]).forEach(([chain, value]: any) => {
          const numValue = Number(value);
          if (!isNaN(numValue)) {

            totals[mappedKey as keyof typeof totals] += numValue;

            initByChainIfNeeded(chain)

            byChain[chain].assetsCount += 1;
            if (item.issuer) byChain[chain].assetIssuers.add(item.issuer);
            (byChain[chain] as any)[mappedKey] += numValue;

            if (item.stablecoin) {
              (byChain[chain].stablecoins as any)[mappedKey] += numValue;
              byChain[chain].stablecoins.assetsCount += 1;
              if (item.issuer) byChain[chain].stablecoins.assetIssuers.add(item.issuer);
            }

            if (item.governance) {
              (byChain[chain].governance as any)[mappedKey] += numValue;
              byChain[chain].governance.assetsCount += 1;
              if (item.issuer) byChain[chain].governance.assetIssuers.add(item.issuer);
            }
          }
        });
      }
    });

    // Aggregate by category
    const categories = item.category || [];
    categories.forEach((cat: string) => addToAggStats(item, cat, byCategory));
    addToAggStats(item, item.parentPlatform, byPlatform);
  });

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
    totalMcap: totals.mcap,
    totalActiveMcap: totals.activeMcap,
    totalDefiActiveTvl: totals.defiActiveTvl,
    totalAssets: currentData.length,
    byChain,
    byCategory,
    byPlatform,
  };

  console.log(`Generated aggregate stats in ${Date.now() - startTime}ms`);
  return stats;
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
    const idMap = await generateIdMap(metadata);
    await storeRouteData('id-map.json', idMap);

    // Generate aggregate stats
    const stats = await generateAggregateStats(currentData);
    await storeRouteData('stats.json', stats);

    // Generate historical data incrementally
    const { updatedIds, totalRecords } = await generateAllHistoricalDataIncremental();
    console.log(`Historical data: updated ${updatedIds} IDs with ${totalRecords} records`);

    // Generate a list of all RWA IDs
    const rwdList = metadata.map((m: RWAMetadata) => {
      try {
        const data = JSON.parse(m.data);
        return {
          id: m.id,
          name: data.name,
          ticker: data.ticker,
          category: data.category,
        };
      } catch {
        return { id: m.id };
      }
    });
    await storeRouteData('list.json', rwdList);

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
