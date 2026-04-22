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

import retry from "async-retry";
import plimit from "p-limit";
import axios, { AxiosRequestConfig } from "axios";
import { getR2JSONString, storeR2JSONString } from '../utils/r2';
import { NoSuchKey } from "@aws-sdk/client-s3";

const DAY = 24 * 3600;
const STORE_KEY = 'stablecoins/dailyVolumes';
const START_DATE = '2021-01-01';
const R2_WRITE_INTERVAL = 10; // after querying this many new days, flush current cache to R2

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
  let success = false;
  try {
    response = await _response;
    success = true;
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
    if (e instanceof NoSuchKey) {
      console.log(`no existing cache at ${STORE_KEY}, starting empty`);
      return {};
    } else {
      console.log(e)
      throw new Error(`failed to load cache from ${STORE_KEY}`);
    }
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
