import * as sdk from "@defillama/sdk";
import { Client } from "@elastic/elasticsearch";
import { normalizeCoinId } from "./utils";

let _client: Client | undefined;
export function getClient(): Client | undefined {
  if (_client) return _client;
  let config;
  try {
    const envString = process.env["COINS_ELASTICSEARCH_CONFIG"];
    if (!envString) return;
    config = JSON.parse(envString.replace(/\\"/g, '"')); // replace escaped quotes
  } catch (error) {
    return;
  }
  if (!_client)
    _client = new Client({
      maxRetries: 3,
      requestTimeout: 5000,
      compression: true,
      node: config.host,
      auth: {
        username: config.username,
        password: config.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  return _client;
}

export interface MetadataRecord {
  pid: string;
  symbol?: string;
  decimals?: number;
  redirects?: string[];
  allRedirects?: string[];
  chain?: string;
  address?: string;
  adapter?: string;
  [key: string]: any;
}

let isInitialized = false;
let initializing: Promise<void> | null = null;

const metadataMap: { [pid: string]: MetadataRecord } = {};
const redirectsMap: { [pid: string]: string[] } = {};
const multiRedirects: Array<{ pid: string; symbol?: string; allRedirects: string[]; count: number }> = [];

const cacheFile = "coins-v3/coinMetadataMap.json";
const expireAfter = 15 * 60; // 15 minutes in seconds

export async function init(): Promise<void> {
  if (isInitialized) return;
  if (!initializing) {
    initializing = _init();
  }
  await initializing;
  isInitialized = true;
}

async function _init(): Promise<void> {
  let records: MetadataRecord[];
  const currentCache = await sdk.cache.readExpiringJsonCache(cacheFile);

  if (currentCache) {
    records = currentCache;
  } else {
    records = await fetchAllRecords("coins-metadata");
    // this is asynchrous, but we don't need to wait for it to finish
    sdk.cache.writeExpiringJsonCache(cacheFile, records, { expireAfter });
  }

  records.forEach((record) => {
    if (!record.pid) {
      console.log("No pid:", record);
      return;
    }
    record.pid = normalizeCoinId(record.pid);
    if (Array.isArray(record.redirects)) {
      record.redirects = record.redirects.map(normalizeCoinId);
    }
    metadataMap[record.pid] = record;
  });

  records.forEach((record) => {
    if (!record.redirects) return;
    const allRedirects: string[] = [];
    record.redirects.forEach((redirect) => {
      if (!redirectsMap[redirect]) {
        redirectsMap[redirect] = getRedirectChain(redirect);
      }
      allRedirects.push(...redirectsMap[redirect]);
    });
    record.allRedirects = [...new Set(allRedirects)];
    if (record.allRedirects.length > 1) {
      multiRedirects.push({
        pid: record.pid,
        symbol: record.symbol,
        allRedirects: record.allRedirects,
        count: record.allRedirects.length,
      });
    }
  });

  const redirectsCount = records.filter((i) => i.redirects && i.redirects.length).length;
  console.log(
    `Fetched ${records.length} records, ${multiRedirects.length} with multiple redirects, ${redirectsCount} with redirects`
  );
}

function getRedirectChain(pid: string, chain: string[] = [], processedSet: Set<string> = new Set()): string[] {
  if (processedSet.has(pid)) { // already processed, to catch circular redirects
    console.log("Circular redirect detected:", pid, chain);
    return chain;
  }
  if (!metadataMap[pid]) return chain; // pid not in our db

  processedSet.add(pid);
  chain.push(pid);
  const record = metadataMap[pid];
  if (!record.redirects) return chain; // no further redirects
  record.redirects.forEach((redirect) => getRedirectChain(redirect, chain, processedSet));

  return chain;
}

async function fetchAllRecords(index: string): Promise<MetadataRecord[]> {
  const allRecords: MetadataRecord[] = [];
  const client = getClient();
  if (!client) throw new Error("Elasticsearch client not configured");
  let response: any = await client.search({
    index: index,
    scroll: "1m",
    body: {
      query: {
        match_all: {},
      },
      size: 100000,
    },
  });

  while (response.hits.hits.length) {
    allRecords.push(
      ...response.hits.hits.map((i: any) => {
        const source = i._source;
        // reduce final file size by removing fields we don't need
        // delete source.chain
        // delete source.address
        // delete source.adapter
        return source;
      })
    );
    console.log(`Fetched ${allRecords.length} records, ${response.hits.hits.length} in batch`);
    response = await client.scroll({
      scroll_id: response._scroll_id,
      scroll: "1m",
    });
  }

  return allRecords;
}

const overrideMetadataFields = ["symbol", "decimals", "adapter"];

// this returns a record if a record needs to be added/updated, otherwise returns undefined
export function getMetadataRecord(json: any): MetadataRecord | undefined {
  if (!isInitialized)
    throw new Error("Coin metadata cache not initialized");

  // probably a price record that does not contain any metadata info
  if (!json.decimals && !json.symbol) return undefined;

  let record: any = json;
  if (record.PK) {
    // it is a dynamodb record, need to change to elastic search record
    record = normalizeRecord(record);
  }

  let existingRecord = metadataMap[record.pid];
  if (existingRecord) {
    let needsUpdate = false;
    overrideMetadataFields.forEach((field) => {
      if (record[field] && record[field] !== existingRecord[field]) {
        existingRecord[field] = record[field];
        needsUpdate = true;
      }
    });
    if (Array.isArray(record.redirects) && record.redirects.length) {
      if (!existingRecord.redirects) existingRecord.redirects = [];
      record.redirects.forEach((redirect: string) => {
        if (!existingRecord.redirects!.includes(redirect)) {
          existingRecord.redirects!.push(redirect);
          needsUpdate = true;
        }
      });
    }
    if (needsUpdate) {
      record = existingRecord;
    } else {
      return undefined;
    }
  } else {
    if (record.redirects) {
      const allRedirects = record.redirects.map((i: string) => getRedirectChain(i));
      record.allRedirects = [...new Set(allRedirects.flat())];
    }
    metadataMap[record.pid] = record;
  }

  const recordClone = { ...record };
  delete recordClone.allRedirects; // we dont want to store this field in the metadata record
  delete recordClone.mcap;
  delete recordClone.timestamp
  return recordClone;
}

function normalizeRecord(record: any): MetadataRecord {
  const pid = normalizeCoinId(record.PK);
  if (record.redirect) {
    record.redirects = [record.redirect];
  }
  delete record.redirect;  // sometimes the field exists but is empty/undefined
  if (Array.isArray(record.redirects)) {
    record.redirects = record.redirects.map(normalizeCoinId);
  }
  record.pid = pid;

  // reduce final record size by removing fields we don't need
  delete record.PK;
  delete record.SK;
  delete record.created;
  delete record.price;
  delete record.confidence;

  if (pid.includes(":")) {
    record.chain = pid.split(":")[0];
    record.address = pid.slice(record.chain.length + 1);
  } else if (pid.length === 42 && pid.startsWith("0x")) {
    record.chain = "ethereum";
    record.address = pid;
  } else if (!record.decimals && !pid.startsWith("0x")) {
    record.chain = "coingecko";
  }

  if (record.decimals) {
    record.decimals = Number(record.decimals);
  }

  return record;
}

export const esClient = getClient() as Client;
