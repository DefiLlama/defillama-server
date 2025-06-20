require("dotenv").config();
import axios from "axios";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write, DbEntry, Read, CoinData } from "./dbInterfaces";
import pLimit from "p-limit";
import { sliceIntoChunks } from "@defillama/sdk/build/util";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";

const rateLimited = pLimit(10);
process.env.tableName = "prod-coins-table";

let cache: any = {};
let lastCacheClear: number;

function padAddress(address: string, length: number = 66): string {
  let prefix = "0x";
  const data = address.substring(address.indexOf(prefix) + prefix.length);
  const zeros = length - prefix.length - data.length;
  for (let i = 0; i < zeros; i++) prefix += "0";
  return prefix + data;
}

function lowercase(address: string, chain: string) {
  if (chain == "starknet") return padAddress(address.toLowerCase());
  return chainsThatShouldNotBeLowerCased.includes(chain)
    ? address
    : address.toLowerCase();
}

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

    const apiRes = await getTokenAndRedirectDataFromAPI(
      tokens,
      chain,
      timestamp,
    );

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
