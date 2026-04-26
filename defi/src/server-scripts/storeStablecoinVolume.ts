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

import * as sdk from "@defillama/sdk";
import { humanizeNumber } from "@defillama/sdk";
import retry from "async-retry";
import plimit from "p-limit";
import axios, { AxiosRequestConfig } from "axios";
import { sendMessage } from '../utils/discord';

const DAY = 24 * 3600;
const STORE_KEY = 'stablecoins/dailyVolumes';
const START_DATE = '2021-01-01';
const R2_WRITE_INTERVAL = 10; // after querying this many new days, flush current cache to R2
const RUN_FIRST_TIME = process.argv.includes('--runFirstTime');

// auto spike detection thresholds — drop a (chain,token) for a given day when
// its volume is BOTH >= SPIKE_ABS_FLOOR and >= SPIKE_RATIO * historical median
// for that (chain,token). require >= SPIKE_MIN_OBS past observations.
const SPIKE_RATIO = 1000;
const SPIKE_ABS_FLOOR = 200_000_000;
const SPIKE_MIN_OBS = 10;

type DetectedSpike = { date: string; chain: string; token: string; volume: number; median: number; ratio: number; historyN: number };
const detectedSpikes: DetectedSpike[] = [];
const _refillIdx = process.argv.indexOf('--refill');
const REFILL_DATE = _refillIdx !== -1 ? process.argv[_refillIdx + 1] : null;
if (_refillIdx !== -1 && (!REFILL_DATE || !/^\d{4}-\d{2}-\d{2}$/.test(REFILL_DATE))) {
  throw new Error('--refill requires a date arg in YYYY-MM-DD format, e.g. --refill 2025-01-01');
}

// tokens with known-bad volume data on allium; excluded from aggregation
//   'all'    -> drop the token from every day
//   string[] -> drop the token only on the listed YYYY-MM-DD dates (UTC)
const TOKEN_BLACKLIST: Record<string, 'all' | string[]> = {
  DUSD: 'all',
  USDX: 'all',
  USDZ: ['2022-08-14'],  // example: blacklist USDZ on specific dates only
  MONEY: ['2024-08-05'],
  SUSD: ['2025-08-06'],
};

function isTokenBlacklisted(token: string, dayTimestamp: number): boolean {
  const rule = TOKEN_BLACKLIST[token];
  if (!rule) return false;
  if (rule === 'all') return true;
  const dateStr = new Date(dayTimestamp * 1000).toISOString().split('T')[0];
  return rule.includes(dateStr);
}

// inlined from dimension-adapters/helpers/allium.ts
// keys are llama chain names, values are the chain names as they appear in allium data
const ALLIUM_CHAIN_MAP: Record<string, string> = {
  'ethereum': 'ethereum',
  'base': 'base',
  'optimism': 'optimism',
  'scroll': 'scroll',
  'bsc': 'bsc',
  'arbitrum': 'arbitrum',
  'avax': 'avalanche',
  'polygon': 'polygon',
  'tron': 'tron',
  'unichain': 'unichain',
  'zora': 'zora',
  'near': 'near',
  'xdai': 'gnosis',
  'ink': 'ink',
  'berachain': 'berachain',
  'polygon_zkevm': 'polygon_zkevm',
  'plasma': 'plasma',
  'monad': 'monad',
  'era': 'zksync',
  'rsk': 'rootstock',
  'wc': 'worldchain',
  'manta': 'manta_pacific',
  'hyperliquid': 'hyperevm',
  'sui': 'sui',
  'solana': 'solana',
  'blast': 'blast',
  'aptos': 'aptos',
  'ton': 'ton',
  'soneium': 'soneium',
  'celo': 'celo',
  'mode': 'mode',
  'plume_mainnet': 'plume',
  'stellar': 'stellar',
  'sonic': 'sonic',
  'stable': 'stable',
  'sei': 'sei',
  'linea': 'linea',
  'tempo': 'tempo',
};

const _alliumTokens: Record<string, string> = {};
const _alliumLimit = plimit(3);
const ALLIUM_HEADERS = {
  "Content-Type": "application/json",
  "X-API-KEY": process.env.ALLIUM_API_KEY,
};
const successCodes = [200, 201, 202, 203, 204, 205, 206, 207, 208, 226];

async function alliumGet(url: string, options?: AxiosRequestConfig) {
  const res = await axios.get(url, options);
  if (!successCodes.includes(res.status)) throw new Error(`Error fetching ${url}: ${res.status} ${res.statusText}`);
  return res.data;
}

async function alliumPost(url: string, data: any, options?: AxiosRequestConfig) {
  const res = await axios.post(url, data, options);
  if (!successCodes.includes(res.status)) throw new Error(`Error fetching ${url}: ${res.status} ${res.statusText}`);
  return res.data;
}

async function startAlliumQuery(sqlQuery: string) {
  const query = await alliumPost(`https://api.allium.so/api/v1/explorer/queries/phBjLzIZ8uUIDlp0dD3N/run-async`, {
    parameters: { fullQuery: sqlQuery }
  }, { headers: ALLIUM_HEADERS });
  return query["run_id"];
}

async function retrieveAlliumResults(queryId: string) {
  const results = await alliumGet(`https://api.allium.so/api/v1/explorer/query-runs/${queryId}/results?f=json`, {
    headers: ALLIUM_HEADERS,
  });
  return results.data;
}

async function _queryAllium(sqlQuery: string) {
  const metadata: any = {
    application: "allium",
    query: sqlQuery,
    table: sqlQuery.split(/from/i)[1].split(/\s/)[1],
  };
  if (!ALLIUM_HEADERS["X-API-KEY"]) {
    throw new Error("Allium API Key is required");
  }

  const _response = retry(
    async (bail) => {
      if (!_alliumTokens[sqlQuery]) {
        try {
          _alliumTokens[sqlQuery] = await startAlliumQuery(sqlQuery);
        } catch (e) {
          console.log("query run-async", e);
          throw e;
        }
      }

      if (!_alliumTokens[sqlQuery]) throw new Error("Couldn't get a token from allium");

      const statusReq = await alliumGet(`https://api.allium.so/api/v1/explorer/query-runs/${_alliumTokens[sqlQuery]}/status`, {
        headers: ALLIUM_HEADERS,
      });

      const status = statusReq;
      if (status === "success") {
        return retrieveAlliumResults(_alliumTokens[sqlQuery]);
      } else if (status === "failed") {
        console.log(`Query ${sqlQuery} failed`, statusReq.data);
        bail(new Error(`Query ${sqlQuery} failed, error ${JSON.stringify(statusReq.data)}`));
        return;
      }
      throw new Error("Still running");
    },
    {
      retries: 15,
      maxTimeout: 1000 * 60 * 2,
      minTimeout: 1000 * 10,
      randomize: true,
    }
  );

  let response;
  try {
    response = await _response;
    metadata.rows = response?.length;
  } catch (e) {
    throw e;
  }
  return response;
}

async function queryAllium(sqlQuery: string) {
  return _alliumLimit(() => _queryAllium(sqlQuery));
}

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

  for (const llamaChain of Object.keys(ALLIUM_CHAIN_MAP)) {
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
  chains: Record<string, {
    tokens: Record<string, number>;
    currencies: Record<string, number>;
  }>;
}

type VolumeCache = Record<string, DailyVolume>;

function buildEmptyDaily(timestamp: number): DailyVolume {
  return { timestamp, chains: {} };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return 0;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(0)}`;
}

function logSpikes() {
  let message: string = '';
  
  if (detectedSpikes.length > 0) {
    message += 'stablecoin volume spikes detected and removed. check code at: server-scripts/storeStablecoinVolume.ts\n\n';
    const sorted = [...detectedSpikes].sort((a, b) => b.volume - a.volume);
    message += sdk.util.tableToString(sorted.map(s => ({
      date: s.date,
      chain: s.chain,
      token: s.token,
      volumeUsd: humanizeNumber(s.volume),
      ratio: `${s.ratio.toFixed(2)}x`,
    })));
  }
  
  if (message.length > 0) {
    console.log(message);
    if (process.env.SPIKES_WEBHOOK) {
      sendMessage(message, process.env.SPIKES_WEBHOOK, true);
    }
  }
}

function collectHistoricalVolumes(cache: VolumeCache, chain: string, token: string, excludeTs: number): number[] {
  const out: number[] = [];
  for (const [ts, daily] of Object.entries(cache)) {
    if (Number(ts) === excludeTs) continue;
    const vol = daily.chains?.[chain]?.tokens?.[token];
    if (typeof vol === 'number' && isFinite(vol) && vol > 0) out.push(vol);
  }
  return out;
}

async function loadCache(): Promise<VolumeCache> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const data = await sdk.cache.readCache(STORE_KEY, { readFromR2Cache: true });
    if (data && Object.keys(data).length > 0) return data;
    console.log(`# cache empty on attempt ${attempt}/${MAX_ATTEMPTS}`);
    if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 2000 * attempt));
  }
  if (RUN_FIRST_TIME) {
    console.log(`# --runFirstTime flag set, starting with empty cache`);
    return {};
  }
  throw new Error(`failed to load cache from ${STORE_KEY} after ${MAX_ATTEMPTS} attempts (cache missing or persistent read failure). use --runFirstTime to bootstrap`);
}

async function queryDay(timestamp: number, history: VolumeCache): Promise<DailyVolume> {
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

  // first pass: aggregate per (chain, token, currency) so we keep the token→currency mapping
  type Bucket = { chain: string; token: string; currency: string; volume: number };
  const buckets = new Map<string, Bucket>();
  for (const record of records) {
    const chain = formatChain(record.chain);
    const token = formatToken(record.token);
    const currency = formatToken(record.currency);
    const volume = Number(record.volume_usd);
    if (!isFinite(volume) || volume <= 0) continue;
    if (isTokenBlacklisted(token, timestamp)) continue;
    const k = `${chain}|${token}|${currency}`;
    const cur = buckets.get(k) || { chain, token, currency, volume: 0 };
    cur.volume += volume;
    buckets.set(k, cur);
  }

  // second pass: per (chain, token) totals for spike detection
  const totals = new Map<string, number>();
  for (const b of buckets.values()) {
    const k = `${b.chain}|${b.token}`;
    totals.set(k, (totals.get(k) || 0) + b.volume);
  }

  // detect spikes vs historical median for this (chain, token)
  const spiked = new Set<string>();
  for (const [k, total] of totals) {
    if (total < SPIKE_ABS_FLOOR) continue;
    const [chain, token] = k.split('|');
    const past = collectHistoricalVolumes(history, chain, token, timestamp);
    if (past.length < SPIKE_MIN_OBS) continue;
    const med = median(past);
    if (med <= 0) continue;
    const ratio = total / med;
    if (ratio >= SPIKE_RATIO) {
      const date = new Date(timestamp * 1000).toISOString().split('T')[0];
      detectedSpikes.push({ date, chain, token, volume: total, median: med, ratio, historyN: past.length });
      spiked.add(k);
    }
  }

  // build daily, skipping spike-detected (blacklist already filtered above)
  const daily = buildEmptyDaily(timestamp);
  for (const b of buckets.values()) {
    if (spiked.has(`${b.chain}|${b.token}`)) continue;
    daily.chains[b.chain] = daily.chains[b.chain] || { tokens: {}, currencies: {} };
    daily.chains[b.chain].tokens[b.token] = (daily.chains[b.chain].tokens[b.token] || 0) + b.volume;
    daily.chains[b.chain].currencies[b.currency] = (daily.chains[b.chain].currencies[b.currency] || 0) + b.volume;
  }
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

  if (REFILL_DATE) {
    const ts = getStartDayTimestamp(getUnixTimestamp(REFILL_DATE));
    console.log(`# refilling ${REFILL_DATE} (ts=${ts})`);
    const daily = await queryDay(ts, cache);
    cache[String(ts)] = daily;
    await sdk.cache.writeCache(STORE_KEY, cache, { skipR2CacheWrite: false });
    console.log(`# refill complete, wrote cache to R2`);
    logSpikes();
    return;
  }

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

    const daily = await queryDay(ts, cache);
    cache[String(ts)] = daily;
    updatedCount++;

    if (updatedCount % R2_WRITE_INTERVAL === 0) {
      await sdk.cache.writeCache(STORE_KEY, cache, { skipR2CacheWrite: false });
      console.log(`# flushed cache to R2 (${updatedCount} new days so far)`);
    }
  }

  const payload = JSON.stringify(cache);
  await sdk.cache.writeCache(STORE_KEY, cache, { skipR2CacheWrite: false });

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
  logSpikes();
  console.log('');
})()
