require("dotenv").config();
import axios from "axios";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { batchGet, batchWrite } from "../../utils/shared/dynamodb";
import { getRecordClosestToTimestamp } from "../../utils/shared/getRecordClosestToTimestamp";
import {
  Write,
  DbEntry,
  DbQuery,
  Read,
  CoinData,
  Metadata,
} from "./dbInterfaces";
const confidenceThreshold: number = 0.3;
const staleCgConfidenceThreshold: number = 0.8;
const staleCgPriceChangeThreshold: number = 0.1; // 10%
import pLimit from "p-limit";

import { staleMargin } from "../../utils/coingeckoPlatforms";
import * as sdk from '@defillama/sdk'
const { sliceIntoChunks, } = sdk.util

import produceKafkaTopics from "../../utils/coins3/produce";
import { lowercase } from "../../utils/coingeckoPlatforms";
import { sendMessage } from "../../../../defi/src/utils/discord";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";

function normalizedPKFor(pk: string): string {
  if (pk.startsWith("coingecko#")) return pk.toLowerCase();
  if (pk.startsWith("block#")) return pk.toLowerCase();
  if (!pk.startsWith("asset#")) return pk;
  const body = pk.slice("asset#".length); // chain:address
  const colonIdx = body.indexOf(":");
  if (colonIdx === -1) return pk.toLowerCase();
  const chain = body.slice(0, colonIdx).toLowerCase();
  let address = body.slice(colonIdx + 1).toLowerCase();
  if (chain === "starknet" && address.length === 66 && address.startsWith("0x0")) {
    address = address.replace(/^0x0+/, "0x");
  }
  return `asset#${chain}:${address}`;
}

const rateLimited = pLimit(10);
process.env.tableName = "prod-coins-table";

let cache: any = {};
let lastCacheClear: number;

export async function getTokenAndRedirectData(
  tokens: string[],
  chain: string,
  timestamp: number,
  hoursRange: number = 12,
): Promise<CoinData[]> {
  if (tokens.length == 0) return [];
  tokens = [...new Set(tokens)];

  if (tokens.length > 100) {
    const chunks: any = sliceIntoChunks(tokens, 99);
    const allData = [];
    for (const chunk of chunks) {
      allData.push(
        await getTokenAndRedirectData(chunk, chain, timestamp, hoursRange),
      );
    }
    return allData.flat();
  }

  if (getCurrentUnixTimestamp() - timestamp < 30 * 60) timestamp = 0; // if timestamp is less than 30 minutes ago, use current timestamp

  const response: CoinData[] = [];
  await rateLimited(async () => {
    if (!lastCacheClear) lastCacheClear = getCurrentUnixTimestamp();
    if (getCurrentUnixTimestamp() - lastCacheClear > 60 * 15)
      cache = {}; // clear cache every 15 minutes

    const cacheKey = `${chain}-${hoursRange}`;
    if (!cache[cacheKey]) cache[cacheKey] = {};
    const alreadyInCache: any[] = [];
    tokens.forEach((token: string) => {
      if (cache[cacheKey][token]) {
        alreadyInCache.push(token);
        response.push(cache[cacheKey][token]);
      }
    });

    tokens = tokens.filter((t: string) => !alreadyInCache.includes(t));
    if (tokens.length == 0) return response;

    let apiRes;
    if (process.env.LOCAL_TEST === "true") {
      apiRes = await getTokenAndRedirectDataFromAPI(tokens, chain, timestamp);
    } else {
      apiRes = await getTokenAndRedirectDataDB(
        tokens,
        chain,
        timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
        hoursRange,
      );
    }

    apiRes.map((r: any) => {
      if (r.address == null) return;
      if (!(cacheKey in cache)) cache[cacheKey] = {};
      cache[cacheKey][r.address] = r;
      return;
    });

    response.push(...apiRes);
  });

  return response;
}

export async function getTokenAndRedirectDataMap(
  tokens: string[],
  chain: string,
  timestamp: number,
  hoursRange: number = 12,
) {
  const res = await getTokenAndRedirectData(
    tokens,
    chain,
    timestamp,
    hoursRange,
  );
  const map: {
    [address: string]: CoinData;
  } = {};
  res.forEach((r: CoinData) => {
    map[r.address] = r;
  });
  return map;
}

export function addToDBWritesList(
  writes: Write[],
  chain: string,
  token: string,
  price: number | undefined,
  decimals: number,
  symbol: string,
  timestamp: number,
  adapter: string,
  confidence: number,
  redirect: string | undefined = undefined,
) {
  const PK: string =
    chain == "coingecko"
      ? `coingecko#${token.toLowerCase()}`
      : `asset#${chain}:${lowercase(token, chain)}`;
  if (redirect && timestamp == 0) {
    writes.push({
      SK: 0,
      PK,
      price,
      symbol,
      decimals: Number(decimals),
      redirect,
      timestamp: getCurrentUnixTimestamp(),
      adapter,
      confidence: Number(confidence),
    });
  } else if (timestamp == 0) {
    writes.push(
      ...[
        {
          SK: getCurrentUnixTimestamp(),
          PK,
          price,
          adapter,
          confidence: Number(confidence),
        },
        {
          SK: 0,
          PK,
          price,
          symbol,
          decimals: Number(decimals),
          redirect,
          timestamp: getCurrentUnixTimestamp(),
          adapter,
          confidence: Number(confidence),
        },
      ],
    );
  } else {
    if (timestamp > 10000000000 || timestamp < 1400000000) {
      new Error("timestamp should be in unix seconds");
    }
    writes.push({
      SK: timestamp,
      PK,
      redirect,
      price,
      adapter,
      confidence: Number(confidence),
    });
  }
}
async function getTokenAndRedirectDataFromAPI(
  tokens: string[],
  chain: string,
  timestamp: number,
) {
  const burl = "https://coins.llama.fi/prices/";
  const historical = timestamp == 0 ? "current/" : `historical/${timestamp}/`;
  const coins = tokens
    .reduce((p: string, c: string) => p + `${chain}:${c},`, "")
    .slice(0, -1);
  const tokenPrices = (await axios.get(`${burl}${historical}${coins}`)).data
    .coins;
  return Object.entries(tokenPrices).map((e: any) => {
    const pk = e[0];
    let data = e[1];
    data.chain = pk.substring(0, pk.indexOf(":"));
    const address = pk.substring(pk.indexOf(":") + 1);
    data.address = chainsThatShouldNotBeLowerCased.includes(data.chain)
      ? address
      : address.toLowerCase();
    return data;
  });
}
async function getTokenAndRedirectDataDB(
  tokens: string[],
  chain: string,
  timestamp: number,
  hoursRange: number,
) {
  let allReads: Read[] = [];
  const batchSize = 500;

  for (let lower = 0; lower < tokens.length; lower += batchSize) {
    const upper =
      lower + batchSize > tokens.length ? tokens.length : lower + batchSize;
    // in order of tokens
    // timestamped origin entries
    let timedDbEntries: any[] = await Promise.all(
      tokens.slice(lower, upper).map((t: string) => {
        return getRecordClosestToTimestamp(
          chain == "coingecko"
            ? `coingecko#${t.toLowerCase()}`
            : `asset#${chain}:${lowercase(t, chain)}`,
          timestamp,
          hoursRange * 60 * 60,
        );
      }),
    );

    // calls probably get jumbled in here
    // current origin entries, for current redirects
    const latestDbEntries: DbEntry[] = await batchGet(
      tokens.slice(lower, upper).map((t: string) => ({
        PK:
          chain == "coingecko"
            ? `coingecko#${t.toLowerCase()}`
            : `asset#${chain}:${lowercase(t, chain)}`,
        SK: 0,
      })),
    );

    // current redirect links
    const redirects: DbQuery[] = latestDbEntries.map((d: DbEntry) => {
      const selectedEntries: any[] = timedDbEntries.filter(
        (t: any) => d.PK == t.PK,
      );
      if (selectedEntries.length == 0) {
        return { PK: d.redirect, SK: d.SK };
      } else {
        return { PK: selectedEntries[0].redirect, SK: selectedEntries[0].SK };
      }
    });

    // timed redirect data
    let timedRedirects: any[] = await Promise.all(
      redirects.map((r: DbQuery) => {
        if (r.PK == undefined) return;
        return getRecordClosestToTimestamp(
          r.PK,
          timestamp,
          hoursRange * 60 * 60,
        );
      }),
    );

    // aggregate
    let validResults: Read[] = latestDbEntries
      .map((ld: DbEntry) => {
        let dbEntry = timedDbEntries.find((e: any) => {
          if (e.SK != null) return e.PK == ld.PK;
        });
        if (dbEntry != null) {
          const latestDbEntry: DbEntry | undefined = latestDbEntries.find(
            (e: any) => {
              if (e.SK != null) return e.PK == ld.PK;
            },
          );

          dbEntry.decimals = latestDbEntry?.decimals;
          dbEntry.symbol = latestDbEntry?.symbol;
        }
        let redirect = timedRedirects.find((e: any) => {
          if (e != null) return e.PK == ld.redirect && e.PK != null;
        });

        if (dbEntry == null && redirect == null)
          return { dbEntry: ld, redirect: ["FALSE"] };
        if (dbEntry && ld.redirect) dbEntry.redirect = ld.redirect;
        if (redirect == null) return { dbEntry, redirect: [] };
        return { dbEntry: ld, redirect: [redirect] };
      })
      .filter((v: any) => v.redirect[0] != "FALSE");

    allReads.push(...validResults);
  }
  return aggregateTokenAndRedirectData(allReads);
}
export async function filterWritesWithLowConfidence(
  allWrites: Write[],
  latencyHours: number = 3,
) {
  const staleTime = getCurrentUnixTimestamp() - latencyHours * 60 * 60;

  allWrites = allWrites.filter((w: Write) => w != undefined);
  const allReads = await batchGet(allWrites.map((w: Write) => ({ PK: w.PK, SK: 0 })));

  const filteredWrites: Write[] = [];
  const checkedWrites: Write[] = [];

  if (allWrites.length == 0) return [];

  allWrites.map((w: Write) => {
    let checkedWritesOfThisKind = checkedWrites.filter(
      (x: Write) =>
        x.PK == w.PK &&
        (((x.SK < w.SK + 1000 || x.SK > w.SK + 1000) &&
          w.SK != 0 &&
          x.SK != 0) ||
          (x.SK == 0 && w.SK == 0)),
    );

    if (checkedWritesOfThisKind.length > 0) return;
    checkedWrites.push(w);

    let allWritesOfThisKind = allWrites.filter(
      (x: Write) =>
        x.PK == w.PK &&
        (((x.SK < w.SK + 1000 || x.SK > w.SK + 1000) &&
          w.SK != 0 &&
          x.SK != 0) ||
          (x.SK == 0 && w.SK == 0)),
    );

    let allReadsOfThisKind = allReads.filter((x: any) => x.PK == w.PK);
    const readTimestamp = allReadsOfThisKind[0]?.timestamp ?? 0;
    const isStale = readTimestamp < staleTime;

    if (allWritesOfThisKind.length == 1) {
      // When stored data is stale (>3h), accept lower confidence writes
      if (
        !isStale &&
        allReadsOfThisKind.length == 1 &&
        allWritesOfThisKind[0].confidence < allReadsOfThisKind[0].confidence
      )
        return;
      if (
        "confidence" in allWritesOfThisKind[0] &&
        allWritesOfThisKind[0].confidence > confidenceThreshold
      ) {
        filteredWrites.push(allWritesOfThisKind[0]);
        return;
      }
    } else {
      const maxConfidence = Math.max.apply(
        null,
        [...allWritesOfThisKind, ...(isStale ? [] : allReadsOfThisKind)].map(
          (x: Write) => x.confidence,
        ),
      );
      filteredWrites.push(
        allWritesOfThisKind.filter(
          (x: Write) =>
            x.confidence == maxConfidence &&
            x.confidence > confidenceThreshold,
        )[0],
      );
    }
  });

  // For asset writes with a stale coingecko redirect, rewrite PK to coingecko#<id>
  // so all chain deployments get repriced from this secondary source
  const redirectMap: Record<string, string> = {}; // asset PK -> coingecko PK
  let staleCgEntries: Record<string, any> = {}; // cgPK -> entry (only if stale or missing)

  const assetWrites = filteredWrites.filter(
    (w) => w?.PK?.startsWith("asset#") && w.confidence >= staleCgConfidenceThreshold,
  );
  if (assetWrites.length > 0) {
    // Reuse allReads instead of re-fetching
    for (const entry of allReads.filter((r: any) => assetWrites.some((w) => w.PK === r.PK))) {
      if (entry?.redirect?.startsWith("coingecko#")) {
        redirectMap[entry.PK] = entry.redirect;
      }
    }

    // Check staleness of the coingecko entries
    const uniqueCgPKs = [...new Set(Object.values(redirectMap))];
    if (uniqueCgPKs.length > 0) {
      const cgEntries = await batchGet(
        uniqueCgPKs.map((pk) => ({ PK: pk, SK: 0 })),
      );
      const now = getCurrentUnixTimestamp();
      const returnedPKs = new Set(cgEntries.map((e: any) => e?.PK).filter(Boolean));
      for (const pk of uniqueCgPKs) {
        if (!returnedPKs.has(pk)) {
          staleCgEntries[pk] = { PK: pk, price: undefined };
        }
      }
      for (const entry of cgEntries) {
        if (!entry) continue;
        if ((now - (entry.timestamp ?? 0)) >= staleMargin) {
          staleCgEntries[entry.PK] = entry;
        }
      }

      // Rewrite qualifying writes to target the coingecko PK
      for (const w of filteredWrites) {
        if (!w?.PK?.startsWith("asset#")) continue;
        const cgPK = redirectMap[w.PK];
        if (!cgPK || !staleCgEntries[cgPK]) continue;
        if (w.confidence < staleCgConfidenceThreshold) continue;

        const cgEntry = staleCgEntries[cgPK];
        if (cgEntry.price && w.price) {
          const priceChange = Math.abs(w.price - cgEntry.price) / cgEntry.price;
          if (priceChange > staleCgPriceChangeThreshold) {
            sdk.log(
              `filterWrites: skipping stale CG override for ${w.PK} -> ${cgPK}: ` +
              `price change ${(priceChange * 100).toFixed(1)}% exceeds ${staleCgPriceChangeThreshold * 100}% threshold`,
            );
            continue;
          }
        }

        sdk.log(
          `filterWrites: ${w.PK} -> ${cgPK} (stale CG feed, confidence ${w.confidence}, $${w.price?.toFixed(4)})`,
        );
        w.PK = cgPK;
      }
    }
  }

  // Remove asset writes whose CG redirect is fresh (not stale) — the CG feed
  // is already providing up-to-date prices so the lower-confidence adapter write is redundant
  return filteredWrites.filter((f: Write) => {
    if (!f) return false;
    if (!f.PK?.startsWith("asset#")) return true;
    const cgPK = redirectMap[f.PK];
    if (!cgPK) return true; // no CG redirect, keep it
    if (staleCgEntries[cgPK]) return true; // CG is stale, keep it (was already rewritten above)
    return false; // CG is fresh, drop the redundant asset write
  });
}
function aggregateTokenAndRedirectData(reads: Read[]) {
  const coinData: CoinData[] = reads
    .map((r: Read) => {
      const addressIndex: number = r.dbEntry.PK.indexOf(":");
      const chainIndex = r.dbEntry.PK.indexOf("#");

      let price =
        r.redirect.length != 0 ? r.redirect[0].price : r.dbEntry.price;
      if (price == undefined) price = -1;

      const confidence =
        "confidence" in r.dbEntry
          ? r.dbEntry.confidence
          : r.redirect.length != 0 && "confidence" in r.redirect[0]
            ? r.redirect[0].confidence
            : undefined;

      return {
        chain:
          addressIndex == -1
            ? undefined
            : r.dbEntry.PK.substring(chainIndex + 1, addressIndex),
        address:
          addressIndex == -1
            ? r.dbEntry.PK
            : r.dbEntry.PK.substring(addressIndex + 1),
        decimals: r.dbEntry.decimals,
        symbol: r.dbEntry.symbol,
        price,
        timestamp: r.dbEntry.SK == 0 ? getCurrentUnixTimestamp() : r.dbEntry.SK,
        redirect:
          r.dbEntry.redirect ??
          (r.redirect.length ? r.redirect[0].PK : undefined),
        confidence,
      };
    })
    .filter((d: CoinData) => d.price != -1);

  return coinData;
}
export async function batchWriteWithAlerts(
  items: any[],
  failOnError: boolean,
): Promise<{ writeCount: number } | undefined> {
  try {
    const { previousItems, veryStaleItems, redirectChanges } = await readPreviousValues(items);
    const filteredItems: any[] =
      (await checkMovement(items, previousItems, veryStaleItems)).filter((i: any) => isFinite(i.price) || i.redirect);
    const writeItems = [...filteredItems, ...redirectChanges]
    const ddbWriteResult = await batchWrite(writeItems, failOnError);
    await produceKafkaTopics(writeItems as any[]);

    // Dual-write: normalized PKs to DDB only (no Kafka, no alerts)
    const normalizedMap = new Map<string, any>();
    writeItems.forEach((item: any) => {
      const nPK = normalizedPKFor(item.PK);
      if (nPK === item.PK) return;
      const copy = { ...item, PK: nPK };
      if (copy.redirect) copy.redirect = normalizedPKFor(copy.redirect);
      normalizedMap.set(`${copy.PK}::${copy.SK}`, copy);
    });
    const normalizedItems = [...normalizedMap.values()];
    if (normalizedItems.length > 0) {
      await batchWrite(normalizedItems, false);
    }

    return ddbWriteResult;
  } catch (e) {
    const adapter = items.find((i) => i.adapter != null)?.adapter;
    console.log(`batchWriteWithAlerts failed with: ${e}`);
    if (process.env.URGENT_COINS_WEBHOOK)
      await sendMessage(
        `batchWriteWithAlerts ${adapter} failed with: ${e}`,
        process.env.URGENT_COINS_WEBHOOK!,
        true,
      );
    else
      await sendMessage(
        "batchWriteWithAlerts error but missing urgent webhook",
        process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
        true,
      );
  }
}
async function readPreviousValues(
  items: any[],
  latencyHours: number = 6,
): Promise<{ previousItems: DbEntry[]; veryStaleItems: Map<string, number>; redirectChanges: any[] }> {
  let queries: { PK: string; SK: number }[] = [];
  items.map(
    (t: any, i: number) => {
      if (i % 2) return;
      queries.push({
        PK: t.PK,
        SK: 0,
      });
    },
  );
  const results = await batchGet(queries);
  const now = getCurrentUnixTimestamp();
  const recentTime = now - latencyHours * 60 * 60;
  const veryStaleTime = now - 2 * latencyHours * 60 * 60;
  const previousItems = results.filter(
    (r: any) => r.timestamp > recentTime || r.confidence > 1,
  );

  const veryStaleItems = new Map<string, number>();
  for (const r of results) {
    if (r && (r.timestamp ?? 0) < veryStaleTime) {
      veryStaleItems.set(r.PK, r.price ?? 0);
    }
  }

  const redirectChanges = findRedirectChanges(items, results);
  return { previousItems, veryStaleItems, redirectChanges };
}
function findRedirectChanges(items: any[], results: any[]): any[] {
  const newRedirects: { [key: string]: any } = {};
  const oldRedirects: { [key: string]: any } = {};
  items.map((i: any) => {
    if (!i.redirect) return;
    newRedirects[i.PK] = i;
  });
  results.map((i: any) => {
    if (!i.redirect) return;
    oldRedirects[i.PK] = i;
  });

  const redirectChanges: any[] = [];
  Object.keys(newRedirects).map((n: string) => {
    const old = oldRedirects[n];
    if (!old) return;
    const { redirect, timestamp, PK, confidence } = newRedirects[n];
    if (old.redirect == redirect) return;
    redirectChanges.push({
      SK: timestamp,
      PK,
      adapter: old.adapter,
      confidence,
      redirect: old.redirect,
    });
  });

  return redirectChanges;
}
async function checkMovement(
  items: any[],
  previousItems: DbEntry[],
  veryStaleItems: Map<string, number>,
  margin: number = 0.5,
): Promise<any[]> {
  const filteredItems: any[] = [];
  const obj: { [PK: string]: any } = {};
  let errors: string = "";
  let staleAlerts: string = "";
  previousItems.map((i: any) => (obj[i.PK] = i));

  items.map((d: any, i: number) => {
    if (i % 2 != 0) return;

    // Data >12h stale: skip % change check, flag for alert
    if (veryStaleItems.has(d.PK)) {
      staleAlerts += `${d.PK} \t $${veryStaleItems.get(d.PK)} -> $${d.price}\n`;
      filteredItems.push(...[items[i], items[i + 1]]);
      return;
    }

    const previousItem = obj[d.PK];
    if (previousItem) {
      const percentageChange: number =
        (d.price - previousItem.price) / previousItem.price;

      if (percentageChange > margin) {
        errors += `${d.adapter} \t ${d.PK.substring(
          d.PK.indexOf("#") + 1,
        )} \t ${(percentageChange * 100).toFixed(3)}% change from $${previousItem.price
          } to $${d.price}\n`;
        return;
      }
    }
    filteredItems.push(...[items[i], items[i + 1]]);
  });

  if (staleAlerts != "" && process.env.STALE_COINS_ADAPTERS_WEBHOOK)
    await sendMessage(
      `Stale coins (>12h) accepting updates:\n${staleAlerts}`,
      process.env.STALE_COINS_ADAPTERS_WEBHOOK,
      true,
    );

  return filteredItems.filter((v: any) => v != null);
}
export async function getDbMetadata(
  assets: string[],
  chain: string,
): Promise<Metadata> {
  const res: DbEntry[] = await batchGet(
    assets.map((a: string) => ({
      PK:
        chain == "coingecko"
          ? `coingecko#${a.toLowerCase()}`
          : `asset#${chain}:${lowercase(a, chain)}`,
      SK: 0,
    })),
  );
  const metadata: Metadata = {};
  res.map((r: DbEntry) => {
    metadata[r.PK.substring(r.PK.indexOf(":") + 1)] = {
      decimals: r.decimals,
      symbol: r.symbol,
    };
  });
  return metadata;
}
