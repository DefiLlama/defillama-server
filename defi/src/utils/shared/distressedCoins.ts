import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";
import { elastic } from "@defillama/sdk";
import { getClient as getCoinsESClient } from "../../storeTvlInterval/computeTVL";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { batchWrite } from "./dynamodb";

const client: any = elastic.getClient(); 

function sanitizeKey(key: string): string {
  const chain = key.split(":")[0];
  const address = key.substring(chain.length + 1);
  const normalizedAddress = chainsThatShouldNotBeLowerCased.includes(chain) ? address : address.toLowerCase();
  return `${chain}:${normalizedAddress}`;
}

// batch check if a list of coins are distressed
export async function batchIsDistressed(keys: string[]) {
  const results: { [key: string]: boolean } = {};

  await runInPromisePool({
    items: keys,
    concurrency: 5,
    processor: async (PK: any) => {
      const key = PK.replace("asset#", "").replace("#", ":");
      const isBlacklisted = await isDistressed(key);
      results[PK] = isBlacklisted;
    },
  });

  return results;
}

// check if a coin is distressed
export async function isDistressed(key: string) {

  const _id = sanitizeKey(key);
  const { hits } = await client.search({
    index: "distressed-assets-store*",
    body: {
      query: {
        match: { _id },
      },
    },
  });

  return hits?.hits?.length > 0;
}

// write sorted logs, and manual entries, to the assets store
export async function addToDistressed(keys: string[]) {
  const body: any[] = [];
  keys.map((key: string) => {
    const _id = sanitizeKey(key);
    body.push({ index: { _index: "distressed-assets-store", _id } });
    body.push({})
  });

  await storeDistressedCoins(keys);
  const res = await client.bulk({ body });
}

// initial write all to temp logs index
export async function logDistressedCoins(keys: any[]) {
  for (const data of keys) {
    data.reportTime = Math.floor(Date.now() / 1000);
    await elastic.writeLog("distressed-assets", data);
  }
}

// get list of possible distressed coins from ES logs in the last week
export async function readDistressedLogs() {
  const aWeekAgo = Math.floor(Date.now() / 1000) - 3600 * 24 * 7;

  let {
    hits: { hits },
  }: any = await client.search({
    index: "distressed-assets*",
    size: 999,
    body: {
      query: {
        range: {
          // find records with reportTime > lastCheckTS
          reportTime: {
            gt: aWeekAgo, // reportTime is in ms
          },
        },
      },
    },
  });

  return hits.map((hit: any) => hit._source);
}

// store distressed metadata to DDB SK0 for metadata retrieval
export async function storeDistressedCoins(keys: string[], coinsESClient?: any) {
  if (!coinsESClient) coinsESClient = getCoinsESClient();
  const metadata: { [key: string]: any } = {};
  await runInPromisePool({
    items: keys,
    concurrency: 5,
    processor: async (key: string) => {
      const chain = key.split(":")[0];
      const address = key.substring(chain.length + 1);
      const pid = ["coingecko", "ethereum"].includes(chain) ? address : key;
      const matches = await coinsESClient.search({
        index: "coins-metadata",
        body: {
          query: {
            match: {
              pid: pid.toLowerCase(),
            },
          },
        },
      });

      if (!matches?.hits?.hits?.length) return;
      metadata[key] = matches.hits.hits[0]._source;
    },
  });

  const items: any[] = [];
  keys.map((key: string) => {
    const PK = key.split(":")[0] == "coingecko" ? key.replace(":", "#") : `asset#${key}`;
    items.push({
      PK,
      SK: 0,
      confidence: 1.01,
      adapter: "distressed",
      timestamp: Math.floor(Date.now() / 1000),
      symbol: metadata[key]?.symbol ?? "-",
      decimals: metadata[key]?.decimals ?? 0,
    });
  });

  await batchWrite(items, false);
}
