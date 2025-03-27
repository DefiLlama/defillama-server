require("dotenv").config();
import axios from "axios";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { batchGet, batchWrite } from "../../utils/shared/dynamodb";
import getTVLOfRecordClosestToTimestamp from "../../utils/shared/getRecordClosestToTimestamp";
import {
  Write,
  DbEntry,
  DbQuery,
  Read,
  CoinData,
  Metadata,
} from "./dbInterfaces";
import { batchWrite2, translateItems } from "../../../coins2";
const confidenceThreshold: number = 0.3;
import pLimit from "p-limit";
import { sliceIntoChunks } from "@defillama/sdk/build/util";
import produceKafkaTopics from "../../utils/coins3/produce";
import { lowercase } from "../../utils/coingeckoPlatforms";
import { sendMessage } from "../../../../defi/src/utils/discord";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";

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
    if (getCurrentUnixTimestamp() - lastCacheClear > 60 * 15) cache = {}; // clear cache every 15 minutes

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
        return getTVLOfRecordClosestToTimestamp(
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
        return getTVLOfRecordClosestToTimestamp(
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
          if (e != null) return e.PK == ld.redirect;
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
  const recentTime: number = getCurrentUnixTimestamp() - latencyHours * 60 * 60;

  allWrites = allWrites.filter((w: Write) => w != undefined);
  const allReads = (
    await batchGet(allWrites.map((w: Write) => ({ PK: w.PK, SK: 0 })))
  ).filter(
    (w: any) =>
      (w.timestamp ?? 0) > recentTime || (w.created ?? 0 > recentTime),
  );

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

    if (allWritesOfThisKind.length == 1) {
      if (
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
        [...allWritesOfThisKind, ...allReadsOfThisKind].map(
          (x: Write) => x.confidence,
        ),
      );
      filteredWrites.push(
        allWritesOfThisKind.filter(
          (x: Write) =>
            x.confidence == maxConfidence && x.confidence > confidenceThreshold,
        )[0],
      );
    }
  });

  return filteredWrites.filter((f: Write) => f != undefined);
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
  items: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[],
  failOnError: boolean,
): Promise<void> {
  try {
    const { previousItems, redirectChanges } = await readPreviousValues(items);
    const filteredItems: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[] =
      await checkMovement(items, previousItems);
    await batchWrite([...filteredItems, ...redirectChanges], failOnError);
    await produceKafkaTopics([...filteredItems, ...redirectChanges] as any[]);
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
export async function batchWrite2WithAlerts(
  items: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[],
) {
  const { previousItems, redirectChanges } = await readPreviousValues(items);
  const filteredItems: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[] =
    await checkMovement(items, previousItems);

  await batchWrite2(
    await translateItems(filteredItems),
    undefined,
    undefined,
    "DB 390",
  );
}
async function readPreviousValues(
  items: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[],
  latencyHours: number = 6,
): Promise<{ previousItems: DbEntry[]; redirectChanges: any[] }> {
  let queries: { PK: string; SK: number }[] = [];
  items.map(
    (t: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap, i: number) => {
      if (i % 2) return;
      queries.push({
        PK: t.PK,
        SK: 0,
      });
    },
  );
  const results = await batchGet(queries);
  const recentTime: number = getCurrentUnixTimestamp() - latencyHours * 60 * 60;
  const previousItems = results.filter(
    (r: any) => r.timestamp > recentTime || r.confidence > 1,
  );

  const redirectChanges = findRedirectChanges(items, results);
  return { previousItems, redirectChanges };
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
  items: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[],
  previousItems: DbEntry[],
  margin: number = 0.5,
): Promise<AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[]> {
  const filteredItems: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[] =
    [];
  const obj: { [PK: string]: any } = {};
  let errors: string = "";
  previousItems.map((i: any) => (obj[i.PK] = i));

  items.map((d: any, i: number) => {
    if (i % 2 != 0) return;
    const previousItem = obj[d.PK];
    if (previousItem) {
      const percentageChange: number =
        (d.price - previousItem.price) / previousItem.price;

      if (percentageChange > margin) {
        errors += `${d.adapter} \t ${d.PK.substring(
          d.PK.indexOf("#") + 1,
        )} \t ${(percentageChange * 100).toFixed(3)}% change from $${
          previousItem.price
        } to $${d.price}\n`;
        return;
      }
    }
    filteredItems.push(...[items[i], items[i + 1]]);
  });

  // if (errors != "" && !process.env.LLAMA_RUN_LOCAL)
  // await sendMessage(errors, process.env.STALE_COINS_ADAPTERS_WEBHOOK!, true);

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
