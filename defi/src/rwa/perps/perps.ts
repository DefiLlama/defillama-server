import { getCurrentUnixTimestamp, getTimestampAtStartOfDay } from "../../utils/date";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { initPG, fetchLatestAggregateTotals, fetchCumulativeFundingPG, fetchLatestFundingTimestampPG, fetchRollingVolumesPG } from "./db";
import { sendMessage } from "../../utils/discord";
import {
  fetchPerpDexs,
  fetchMetaAndAssetCtxs,
  fetchFundingHistory,
  parseMetaAndAssetCtxs,
  parseFundingHistory,
  type ParsedPerpsMarket,
} from "./platforms/hyperliquid";
import {
  getMarketId,
  getMarketMetadata,
  hasMarketMetadata,
  loadMarketMetadataFromAirtable,
  CIRCUIT_BREAKER_THRESHOLD,
} from "./constants";
import { HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE } from "./platforms/hyperliquid";
import { computeProtocolFees, toFiniteNumberOrZero } from "./utils";
import { storeHistorical, storeMetadata, storeFundingHistory } from "./historical";
import type { PerpsDataEntry } from "./historical";

export async function main(ts: number = 0): Promise<void> {
  const timestamp = ts || getCurrentUnixTimestamp();
  console.log(`RWA Perps start ${new Date(timestamp * 1000).toISOString()}`);

  const metadataCount = await loadMarketMetadataFromAirtable();
  console.log(`RWA Perps loaded ${metadataCount} market metadata entries from Airtable`);

  await initPG();

  const venues = await fetchPerpDexs();
  console.log(`RWA Perps found ${venues.length} venues: ${venues.map((v) => v.name).join(", ")}`);
  if (venues.length === 0) return;

  const allMarkets: ParsedPerpsMarket[] = [];
  await runInPromisePool({
    items: venues,
    concurrency: 3,
    processor: async (venue: { name: string; index: number }) => {
      const response = await fetchMetaAndAssetCtxs(venue.name);
      if (!response) return;

      const markets = parseMetaAndAssetCtxs(response, venue.name);
      console.log(`RWA Perps venue ${venue.name}: ${markets.length} markets`);
      allMarkets.push(...markets);
    },
  });

  if (allMarkets.length === 0) return;

  // 3. Filter to only markets with spreadsheet metadata; alert on missing ones
  const knownMarkets: ParsedPerpsMarket[] = [];
  const missingMetadata: string[] = [];
  for (const market of allMarkets) {
    if (hasMarketMetadata(market.coin)) {
      knownMarkets.push(market);
    } else {
      missingMetadata.push(`${market.coin}`);
    }
  }

  if (missingMetadata.length > 0) {
    const msg = `RWA Perps  ${
      missingMetadata.length
    } market(s) skipped — missing spreadsheet metadata:\n${missingMetadata.slice(0, 11).join(", ")}`;
    console.warn(msg);
    if (process.env.RWA_WEBHOOK) {
      await sendMessage(msg, process.env.RWA_WEBHOOK, false);
    }
  }

  if (knownMarkets.length === 0) return;

  const fundingEntries: Array<{
    timestamp: number;
    coin: string;
    venue: string;
    fundingRate: number;
    premium: number;
    openInterest: number;
    fundingPayment: number;
  }> = [];

  await runInPromisePool({
    items: knownMarkets,
    concurrency: 5,
    processor: async (market: ParsedPerpsMarket) => {
      const marketId = getMarketId(market.coin);

      const latestTs = await fetchLatestFundingTimestampPG(marketId);
      const startTime = latestTs
        ? (latestTs + 1) * 1000 
        : (timestamp - 86400) * 1000;
      const endTime = timestamp * 1000;
      if (startTime >= endTime) return;

      const history = await fetchFundingHistory(market.coin, startTime, endTime);
      if (history.length === 0) return;

      const parsed = parseFundingHistory(history, market.venue, market.openInterest);
      fundingEntries.push(...parsed);
    },
  });

  if (fundingEntries.length > 0) await storeFundingHistory(fundingEntries);

  // Fetch rolling 7d/30d volumes from daily history (single query for all IDs)
  const secondsInDay = 86400;
  const since30d = getTimestampAtStartOfDay(timestamp - 30 * secondsInDay);
  const since7d = getTimestampAtStartOfDay(timestamp - 7 * secondsInDay);
  const rollingVolumes = await fetchRollingVolumesPG(since30d, since7d);

  const finalData: { [id: string]: PerpsDataEntry } = {};
  await runInPromisePool({
    items: knownMarkets,
    concurrency: 10,
    processor: async (market: ParsedPerpsMarket) => {
      const marketId = getMarketId(market.coin);
      const metadata = getMarketMetadata(market.coin)!;

      const cumulativeFunding = await fetchCumulativeFundingPG(marketId);

      const fees24h = computeProtocolFees(market.volume24h, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE);

      const rolling = rollingVolumes[marketId] || { volume7d: 0, volume30d: 0, volumeAllTime: 0 };
      // Include today's 24h volume in the rolling windows
      const volume7d = rolling.volume7d + market.volume24h;
      const volume30d = rolling.volume30d + market.volume24h;
      const volumeAllTime = rolling.volumeAllTime + market.volume24h;
      const fees7d = computeProtocolFees(volume7d, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE);
      const fees30d = computeProtocolFees(volume30d, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE);
      const feesAllTime = computeProtocolFees(volumeAllTime, HYPERLIQUID_TAKER_FEE, HYPERLIQUID_DEPLOYER_SHARE);

      finalData[marketId] = {
        coin: market.coin,
        venue: market.venue,
        openInterest: market.openInterest * market.markPx,
        volume24h: market.volume24h,
        price: market.markPx,
        priceChange24h: market.priceChange24h,
        fundingRate: market.fundingRate,
        premium: market.premium,
        cumulativeFunding,
        data: {
          oraclePx: market.oraclePx,
          midPx: market.midPx,
          prevDayPx: market.prevDayPx,
          maxLeverage: market.maxLeverage,
          szDecimals: market.szDecimals,
          makerFeeRate: metadata.makerFeeRate,
          takerFeeRate: metadata.takerFeeRate,
          volume7d,
          volume30d,
          volumeAllTime,
          estimatedProtocolFees24h: fees24h,
          estimatedProtocolFees7d: fees7d,
          estimatedProtocolFees30d: fees30d,
          estimatedProtocolFeesAllTime: feesAllTime,
          referenceAsset: metadata.referenceAsset,
          referenceAssetGroup: metadata.referenceAssetGroup,
          assetClass: metadata.assetClass,
          parentPlatform: metadata.parentPlatform,
          pair: metadata.pair,
          marginAsset: metadata.marginAsset,
          settlementAsset: metadata.settlementAsset,
          category: metadata.category,
          rwaClassification: metadata.rwaClassification,
        },
      };
    },
  });

  console.log(`RWA Perps - data for ${Object.keys(finalData).length} markets`);
  const circuitBreakerPassed = await checkCircuitBreaker(finalData);
  if (!circuitBreakerPassed) return;

  console.log("RWA Perps  Storing historical data...");
  await storeHistorical({ data: finalData, timestamp });
  console.log("RWA Perps  Storing metadata...");
  await storeMetadata({ data: finalData });
  console.log(`RWA Perps done - ${Object.keys(finalData).length} markets`);
}

async function checkCircuitBreaker(newData: { [id: string]: PerpsDataEntry }): Promise<boolean> {
  const previousTotals = await fetchLatestAggregateTotals();
  if (!previousTotals) return true;

  let newTotalOI = 0;
  let newTotalVol = 0;
  for (const entry of Object.values(newData)) {
    newTotalOI += toFiniteNumberOrZero(entry.openInterest);
    newTotalVol += toFiniteNumberOrZero(entry.volume24h);
  }

  const oiChange =
    previousTotals.openInterest > 0
      ? Math.abs(newTotalOI - previousTotals.openInterest) / previousTotals.openInterest
      : 0;

  if (oiChange > CIRCUIT_BREAKER_THRESHOLD) {
    const msg = `RWA Perps OI changed by ${(oiChange * 100).toFixed(
      1
    )}% (prev: ${previousTotals.openInterest.toFixed(0)}, new: ${newTotalOI.toFixed(0)})`;
    console.error(msg);
    if (process.env.RWA_WEBHOOK) {
      await sendMessage(msg, process.env.RWA_WEBHOOK, false);
    }
    return false;
  }

  return true;
}

// main()
//   .then(() => {
//     console.log("RWA Perps done");
//     process.exit(0);
//   })
//   .catch((e) => {
//     console.error("RWA Perps error:", e);
//     process.exit(1);
//   }); // ts-node defi/src/rwa/perps/perps.ts