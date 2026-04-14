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
} from './file-cache';
import {
    initPG,
    fetchCurrentPG,
    fetchMetadataPG,
    fetchAllDailyRecordsPG,
    fetchMaxUpdatedAtPG,
    fetchAllDailyIdsPG,
} from './db';
import { toFiniteNumberOrZero, groupBy } from './utils';
import { main as runPipeline } from './perps';
import {
    buildCategoryHistoricalCharts,
    buildContractBreakdownCharts,
    buildOverviewBreakdownCharts,
    buildPerpsIdMap,
    buildVenueHistoricalCharts
} from './aggregate';
import { normalizePerpsMetadataInPlace } from './constants';
import { normalizePerpsAssetGroup } from './server-helpers';

interface PerpsMetadata {
    id: string;
    data: any;
}

async function generateCurrentData(metadata: PerpsMetadata[]): Promise<any[]> {
    console.log('Generating current perps data...');
    const startTime = Date.now();

    const currentData = await fetchCurrentPG();
    const metadataMap = new Map<string, any>();
    metadata.forEach((m) => metadataMap.set(m.id, m.data));

    const result = currentData.map((record: any) => {
        const meta = metadataMap.get(record.id) || {};
        const merged = {
            ...(record.data || {}),
            ...meta,
        };
        normalizePerpsMetadataInPlace(merged);

        return {
            id: record.id,
            timestamp: record.timestamp,
            openInterest: toFiniteNumberOrZero(record.open_interest),
            volume24h: toFiniteNumberOrZero(record.volume_24h),
            price: toFiniteNumberOrZero(record.price),
            priceChange24h: toFiniteNumberOrZero(record.price_change_24h),
            fundingRate: toFiniteNumberOrZero(record.funding_rate),
            premium: toFiniteNumberOrZero(record.premium),
            cumulativeFunding: toFiniteNumberOrZero(record.cumulative_funding),
            ...merged,
            contract: merged.contract || record.id,
            venue: merged.venue || record.id.split(':')[0] || 'unknown',
        };
    });

    await storeRouteData('current.json', result);
    console.log(`Generated current.json with ${result.length} markets in ${Date.now() - startTime}ms`);
    return result;
}

async function generateIdMap(metadata: PerpsMetadata[]): Promise<void> {
    console.log('Generating ID map...');
    const idMap = buildPerpsIdMap(metadata);
    await storeRouteData('id-map.json', idMap);
    let idMapCount = 0;
    for (const _id in idMap) {
        idMapCount++;
    }
    console.log(`Generated id-map.json with ${idMapCount} entries`);
}

async function generateStats(currentData: any[]): Promise<void> {
    console.log('Generating stats...');

    let totalOpenInterest = 0;
    let totalVolume24h = 0;
    let totalCumulativeFunding = 0;
    const venueStats: { [venue: string]: { openInterest: number; volume24h: number; markets: number } } = {};
    const categoryStats: { [cat: string]: { openInterest: number; volume24h: number; markets: number } } = {};
    const assetGroupStats: { [assetGroup: string]: { openInterest: number; volume24h: number; markets: number } } = {};

    for (const market of currentData) {
        const oi = toFiniteNumberOrZero(market.openInterest);
        const vol = toFiniteNumberOrZero(market.volume24h);
        const cf = toFiniteNumberOrZero(market.cumulativeFunding);

        totalOpenInterest += oi;
        totalVolume24h += vol;
        totalCumulativeFunding += cf;

        // Venue stats
        const venue = market.venue || 'unknown';
        if (!venueStats[venue]) venueStats[venue] = { openInterest: 0, volume24h: 0, markets: 0 };
        venueStats[venue].openInterest += oi;
        venueStats[venue].volume24h += vol;
        venueStats[venue].markets++;

        // Category stats
        const categories = Array.isArray(market.category) ? market.category : [market.category || 'Other'];
        for (const cat of categories) {
            if (!categoryStats[cat]) categoryStats[cat] = { openInterest: 0, volume24h: 0, markets: 0 };
            categoryStats[cat].openInterest += oi;
            categoryStats[cat].volume24h += vol;
            categoryStats[cat].markets++;
        }

        // Asset-group stats
        const assetGroup = normalizePerpsAssetGroup(market.referenceAssetGroup);
        if (!assetGroupStats[assetGroup]) assetGroupStats[assetGroup] = { openInterest: 0, volume24h: 0, markets: 0 };
        assetGroupStats[assetGroup].openInterest += oi;
        assetGroupStats[assetGroup].volume24h += vol;
        assetGroupStats[assetGroup].markets++;
    }

    const stats = {
        totalMarkets: currentData.length,
        totalOpenInterest,
        totalVolume24h,
        totalCumulativeFunding,
        byVenue: venueStats,
        byCategory: categoryStats,
        byAssetGroup: assetGroupStats,
        lastUpdated: new Date().toISOString(),
    };

    await storeRouteData('stats.json', stats);
    console.log(`Generated stats.json`);
}

async function generateList(currentData: any[]): Promise<void> {
    console.log('Generating list...');

    const contracts = [...new Set(currentData.map((m: any) => m.contract).filter(Boolean))].sort();
    const venues = [...new Set(currentData.map((m: any) => m.venue).filter(Boolean))].sort();
    const categories = [...new Set(currentData.flatMap((m: any) => {
        return Array.isArray(m.category) ? m.category : [m.category || 'Other'];
    }))].sort();
    const assetGroups = [...new Set(currentData.map((m: any) => normalizePerpsAssetGroup(m.referenceAssetGroup)).filter(Boolean))].sort();

    const list = {
        contracts,
        venues,
        categories,
        assetGroups,
        total: currentData.length,
    };

    await storeRouteData('list.json', list);
    console.log(`Generated list.json`);
}

async function generateHistoricalCharts(): Promise<void> {
    console.log('Generating historical charts...');
    const startTime = Date.now();

    const syncMeta = await getSyncMetadata();
    const lastSync = syncMeta?.lastSyncTimestamp ? new Date(syncMeta.lastSyncTimestamp) : undefined;

    const allRecords = await fetchAllDailyRecordsPG(lastSync);
    if (allRecords.length === 0) {
        console.log('No new records to process for charts.');
        return;
    }

    // Group records by id
    const recordsById = groupBy(allRecords, (r: any) => r.id);
    let processedCount = 0;

    for (const id in recordsById) {
        const records = recordsById[id];
        const newData = records.map((r: any) => ({
            timestamp: r.timestamp,
            openInterest: toFiniteNumberOrZero(r.open_interest),
            volume24h: toFiniteNumberOrZero(r.volume_24h),
            price: toFiniteNumberOrZero(r.price),
            priceChange24h: toFiniteNumberOrZero(r.price_change_24h),
            fundingRate: toFiniteNumberOrZero(r.funding_rate),
            premium: toFiniteNumberOrZero(r.premium),
            cumulativeFunding: toFiniteNumberOrZero(r.cumulative_funding),
        }));

        const existing = await readHistoricalDataForId(id);
        const merged = mergeHistoricalData(existing, newData);
        await storeHistoricalDataForId(id, merged);
        processedCount++;
    }

    // Update sync metadata
    const maxUpdatedAt = await fetchMaxUpdatedAtPG();
    await setSyncMetadata({
        lastSyncTimestamp: maxUpdatedAt?.toISOString() || null,
        lastSyncDate: new Date().toISOString(),
        totalIds: (await fetchAllDailyIdsPG()).length,
    });

    console.log(`Generated charts for ${processedCount} markets in ${Date.now() - startTime}ms`);
}

// TODO: perf — this fetches ALL daily records on every cron run (no lastSync filter).
// Fine for now, but will need incremental sync like generateHistoricalCharts once history grows.
async function generateAggregateHistoricalCharts(metadata: PerpsMetadata[]): Promise<void> {
    console.log('Generating aggregate historical charts...');

    const allDailyRecords = await fetchAllDailyRecordsPG();
    const venueCharts = buildVenueHistoricalCharts(allDailyRecords, metadata);
    const categoryCharts = buildCategoryHistoricalCharts(allDailyRecords, metadata);
    const overviewBreakdownCharts = buildOverviewBreakdownCharts(allDailyRecords, metadata);
    const contractBreakdownCharts = buildContractBreakdownCharts(allDailyRecords, metadata);

    for (const venueKey in venueCharts) {
        const rows = venueCharts[venueKey];
        await storeRouteData(`charts/venue/${venueKey}.json`, rows);
    }

    for (const categoryKey in categoryCharts) {
        const rows = categoryCharts[categoryKey];
        await storeRouteData(`charts/category/${categoryKey}.json`, rows);
    }

    for (const subPath in overviewBreakdownCharts) {
        const rows = overviewBreakdownCharts[subPath];
        await storeRouteData(`charts/${subPath}`, rows);
    }

    for (const subPath in contractBreakdownCharts) {
        const rows = contractBreakdownCharts[subPath];
        await storeRouteData(`charts/${subPath}`, rows);
    }

    let venueChartCount = 0;
    for (const _venue in venueCharts) {
        venueChartCount++;
    }

    let categoryChartCount = 0;
    for (const _category in categoryCharts) {
        categoryChartCount++;
    }

    let overviewBreakdownCount = 0;
    for (const _subPath in overviewBreakdownCharts) {
        overviewBreakdownCount++;
    }

    let contractBreakdownCount = 0;
    for (const _subPath in contractBreakdownCharts) {
        contractBreakdownCount++;
    }

    console.log(
        `Generated aggregate historical charts for ${venueChartCount} venues, ${categoryChartCount} categories, ${overviewBreakdownCount} overview breakdowns, and ${contractBreakdownCount} contract breakdowns`
    );
}

// ── Main cron ────────────────────────────────────────────────────────────────

async function cron(): Promise<void> {
    const startTime = Date.now();
    console.log(`[rwa-perps-cron] Starting at ${new Date().toISOString()}`);
    console.log(`[rwa-perps-cron] Cache version: ${getCacheVersion()}`);

    // 0. Clear old cache
    clearOldCacheVersions();

    // 1. Initialize DB
    await initPG();

    // 2. Run the data pipeline (fetch from Hyperliquid, store to DB)
    console.log('[rwa-perps-cron] Running data pipeline...');
    await runPipeline();

    // 3. Fetch metadata
    const metadata = await fetchMetadataPG();
    console.log(`[rwa-perps-cron] Loaded ${metadata.length} metadata records`);

    // 4. Generate cache files
    const currentData = await generateCurrentData(metadata);
    await generateIdMap(metadata);
    await generateStats(currentData);
    await generateList(currentData);
    await generateHistoricalCharts();
    await generateAggregateHistoricalCharts(metadata);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[rwa-perps-cron] Complete in ${elapsed}s`);
}

cron()
    .then(() => {
        console.log("[rwa-perps-cron] Done.");
        process.exit(0);
    })
    .catch((e) => {
        console.error("[rwa-perps-cron] Fatal error:", e);
        process.exit(1);
    });
