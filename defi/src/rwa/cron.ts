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
  defiactivetvl: string;
  mcap: string;
  activemcap: string;
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
  current.forEach((c: RWACurrentData) => {
    currentMap[c.id] = c;
  });

  const data: any[] = [];
  let timestamp = 0;

  metadata.forEach((m: RWAMetadata) => {
    const idCurrent = currentMap[m.id];
    if (!idCurrent) return;

    Object.keys(idCurrent).forEach((key: string) => {
      if (key === 'timestamp' && idCurrent[key] > timestamp) {
        timestamp = idCurrent[key];
      } else if (key === 'id') {
        return;
      } else if (['defiactivetvl', 'mcap', 'activemcap'].includes(key)) {
        const parsed = JSON.parse((idCurrent as any)[key]);
        m.data[key] = convertChainKeysToLabels(parsed);
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
    if (m.data.name) {
      idMap[m.data.name] = m.id;
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

  let totalMcap = 0;
  let totalActiveMcap = 0;
  let totalDefiActiveTvl = 0;

  const byCategory: { [category: string]: { mcap: number; activeMcap: number; defiActiveTvl: number; count: number } } = {};
  const byChain: { [chain: string]: { mcap: number; activeMcap: number; defiActiveTvl: number } } = {};
  const byPlatform: { [platform: string]: { mcap: number; activeMcap: number; defiActiveTvl: number; count: number } } = {};

  function addToAggStats(item: any, value: string, aggObj: any) {
    if (!value) return;
    if (!aggObj[value]) {
      aggObj[value] = { mcap: 0, activeMcap: 0, defiActiveTvl: 0, count: 0 };
    }
    const aggItem = aggObj[value];
    aggObj[value].count += 1;

    aggItem.count += 1;

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

  currentData.forEach((item: any) => {
    // Aggregate mcap by chain
    if (item.mcap && typeof item.mcap === 'object') {
      Object.entries(item.mcap).forEach(([chain, value]) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          totalMcap += numValue;
          if (!byChain[chain]) {
            byChain[chain] = { mcap: 0, activeMcap: 0, defiActiveTvl: 0 };
          }
          byChain[chain].mcap += numValue;
        }
      });
    }

    // Aggregate activeMcap by chain
    if (item.activemcap && typeof item.activemcap === 'object') {
      Object.entries(item.activemcap).forEach(([chain, value]) => {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          totalActiveMcap += numValue;
          if (!byChain[chain]) {
            byChain[chain] = { mcap: 0, activeMcap: 0, defiActiveTvl: 0 };
          }
          byChain[chain].activeMcap += numValue;
        }
      });
    }

    // Aggregate defiActiveTvl by chain
    if (item.defiactivetvl && typeof item.defiactivetvl === 'object') {
      Object.entries(item.defiactivetvl).forEach(([chain, protocols]) => {
        if (protocols && typeof protocols === 'object') {
          Object.values(protocols as { [key: string]: string }).forEach((value) => {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              totalDefiActiveTvl += numValue;
              if (!byChain[chain]) {
                byChain[chain] = { mcap: 0, activeMcap: 0, defiActiveTvl: 0 };
              }
              byChain[chain].defiActiveTvl += numValue;
            }
          });
        }
      });
    }

    // Aggregate by category
    const categories = item.category || [];
    categories.forEach((cat: string) => addToAggStats(item, cat, byCategory));
    addToAggStats(item, item.parentPlatform, byPlatform);
  });

  const stats = {
    totalMcap,
    totalActiveMcap,
    totalDefiActiveTvl,
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
