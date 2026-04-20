// this script pulls stablecoin volume from allium and stores into a single R2 cache file
//
// need these env configs to run the script
// R2_ENDPOINT=
// R2_ACCESS_KEY_ID=
// R2_SECRET_ACCESS_KEY=
// ALLIUM_API_KEY=
//
// flow:
//   1. load existing cache from R2 (single file keyed by day timestamp)
//   2. determine missing days between START_DATE and yesterday
//   3. query allium for each missing day (one at a time, allium is rate limited)
//   4. flush cache to R2 every R2_WRITE_INTERVAL days + once at the end
//

import { ALLIUM_CHAIN_MAP, queryAllium } from '../../dimension-adapters/helpers/allium';
import { CHAIN } from '../../dimension-adapters/helpers/chains';
import { getR2JSONString, storeR2JSONString } from '../utils/r2';

const DAY = 24 * 3600;
const STORE_KEY = 'stablecoins/dailyVolumes';
const START_DATE = '2021-01-01';
const R2_WRITE_INTERVAL = 20; // after querying this many new days, flush current cache to R2

const getCurrentTimestamp = () => Math.floor(new Date().getTime() / 1000);
const getUnixTimestamp = (date: string) => Math.floor(new Date(date).getTime() / 1000);
function getStartDayTimestamp(timestamp: number) {
  const theDay = new Date(timestamp * 1000).toISOString().split('T')[0];
  return Math.floor(new Date(theDay).getTime() / 1000);
}

const warnedUnknownChains = new Set<string>();
function formatChain(chain: string): string {
  for (const [llamaChain, alliumChain] of Object.entries(ALLIUM_CHAIN_MAP)) {
    if (chain === alliumChain) return llamaChain;
  }

  for (const llamaChain of Object.values(CHAIN)) {
    if (chain === llamaChain) return llamaChain;
  }

  if (!warnedUnknownChains.has(chain)) {
    console.warn(`no chain mapping found for allium chain ${chain}, using raw value`);
    warnedUnknownChains.add(chain);
  }
  return chain;
}

function formatToken(token: string): string {
  return token.toUpperCase();
}

interface DailyVolume {
  timestamp: number;
  chains: Record<string, number>;
  tokens: Record<string, number>;
  currencies: Record<string, number>;
}

type VolumeCache = Record<string, DailyVolume>;

function buildEmptyDaily(timestamp: number): DailyVolume {
  return { timestamp, chains: {}, tokens: {}, currencies: {} };
}

function aggregateRecord(daily: DailyVolume, record: any) {
  const chain = formatChain(record.chain);
  const token = formatToken(record.token);
  const currency = formatToken(record.currency);
  const volume = Number(record.volume_usd);

  daily.chains[chain] = (daily.chains[chain] || 0) + volume;
  daily.tokens[token] = (daily.tokens[token] || 0) + volume;
  daily.currencies[currency] = (daily.currencies[currency] || 0) + volume;
}

async function loadCache(): Promise<VolumeCache> {
  try {
    const data = await getR2JSONString(STORE_KEY);
    return data || {};
  } catch (e) {
    console.log(`no existing cache found at ${STORE_KEY}, starting empty (${(e as Error).message})`);
    return {};
  }
}

async function queryDay(timestamp: number): Promise<DailyVolume> {
  const daily = buildEmptyDaily(timestamp);
  const records = await queryAllium(`
    select
      chain,
      base_asset as token,
      currency,
      TO_DATE(activity_date) as date,
      sum(entity_adjusted_single_direction_max_transfer_volume_usd) as volume_usd
    from
      crosschain.metrics.stablecoin_volume
    where
      TO_DATE(activity_date) = TO_DATE(TO_TIMESTAMP_NTZ(${timestamp}))
      and currency is not null
      and transfer_volume_is_anomaly = false
    group by all
    having sum(entity_adjusted_single_direction_max_transfer_volume_usd) is not null
  `);

  for (const record of records) aggregateRecord(daily, record);
  return daily;
}

(async function () {
  const currentTimestamp = getCurrentTimestamp();
  const yesterdayStart = getStartDayTimestamp(currentTimestamp - DAY);
  const startTs = getStartDayTimestamp(getUnixTimestamp(START_DATE));

  console.log('');
  console.log('start store stablecoin volume data');

  const cache = await loadCache();
  console.log(`# cache loaded from R2, existing days: ${Object.keys(cache).length}`);

  const missingDays: number[] = [];
  for (let ts = startTs; ts <= yesterdayStart; ts += DAY) {
    if (!cache[String(ts)]) missingDays.push(ts);
  }
  console.log(`# missing days: ${missingDays.length}`);

  let updatedCount = 0;
  for (let i = 0; i < missingDays.length; i++) {
    const ts = missingDays[i];
    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
    console.log(`# querying ${i + 1}/${missingDays.length} (${dateStr})`);

    const daily = await queryDay(ts);
    cache[String(ts)] = daily;
    updatedCount++;

    if (updatedCount % R2_WRITE_INTERVAL === 0) {
      await storeR2JSONString(STORE_KEY, JSON.stringify(cache));
      console.log(`# flushed cache to R2 (${updatedCount} new days so far)`);
    }
  }

  const payload = JSON.stringify(cache);
  await storeR2JSONString(STORE_KEY, payload);

  const totalDays = Object.keys(cache).length;
  const bytes = Buffer.byteLength(payload);
  const mb = bytes / (1024 * 1024);
  const perDayKb = totalDays ? bytes / totalDays / 1024 : 0;

  console.log('');
  console.log('stored stablecoin volume data');
  console.log(`# r2 storeKey: ${STORE_KEY}`);
  console.log(`# days updated: ${updatedCount}`);
  console.log(`# total days in cache: ${totalDays}`);
  console.log(`# cache size: ${bytes.toLocaleString()} bytes (${mb.toFixed(2)} MB, ~${perDayKb.toFixed(2)} KB/day)`);
  console.log('');
})()
