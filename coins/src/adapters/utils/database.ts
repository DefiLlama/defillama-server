require("dotenv").config();
import axios from "axios";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { batchGet, batchWrite } from "../../utils/shared/dynamodb";
import getTVLOfRecordClosestToTimestamp from "../../utils/shared/getRecordClosestToTimestamp";
import { Write, DbEntry, DbQuery, Read, CoinData } from "./dbInterfaces";
import { contracts } from "../other/distressedAssets";
import { sendMessage } from "./../../../../defi/src/utils/discord";

const confidenceThreshold: number = 0.3;

export async function getTokenAndRedirectData(
  tokens: string[],
  chain: string,
  timestamp: number,
  hoursRange: number = 12,
): Promise<CoinData[]> {
  tokens = [...new Set(tokens)];
  if (process.env.DEFILLAMA_SDK_MUTED !== "true") {
    return await getTokenAndRedirectDataFromAPI(tokens, chain, timestamp);
  }
  return await getTokenAndRedirectDataDB(
    tokens,
    chain,
    timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
    hoursRange,
  );
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
      : `asset#${chain}:${chain == "solana" ? token : token.toLowerCase()}`;
  if (timestamp == 0) {
    writes.push(
      ...[
        {
          SK: getCurrentUnixTimestamp(),
          PK,
          price,
          redirect,
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
          ...(price !== undefined
            ? {
                timestamp: getCurrentUnixTimestamp(),
              }
            : {}),
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
    data.address = pk.substring(pk.indexOf(":") + 1);
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
            : `asset#${chain}:${chain == "solana" ? t : t.toLowerCase()}`,
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
            : `asset#${chain}:${chain == "solana" ? t : t.toLowerCase()}`,
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
          r.SK,
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
        if (redirect == null) return { dbEntry, redirect: [] };
        return { dbEntry: ld, redirect: [redirect] };
      })
      .filter((v: any) => v.redirect[0] != "FALSE");

    allReads.push(...validResults);
  }
  return aggregateTokenAndRedirectData(allReads);
}
export function filterWritesWithLowConfidence(allWrites: Write[]) {
  allWrites = allWrites.filter((w: Write) => w != undefined);
  const filteredWrites: Write[] = [];
  const checkedWrites: Write[] = [];

  if (allWrites.length == 0) return [];

  const chain = allWrites[0].PK.substring(
    allWrites[0].PK.indexOf("#") + 1,
    allWrites[0].PK.indexOf(":"),
  );

  const distressedAssets =
    chain in contracts
      ? Object.values(contracts[chain]).map((d: string) =>
          chain == "solana" ? d : d.toLowerCase(),
        )
      : [];

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

    if (allWritesOfThisKind.length == 1) {
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
        allWritesOfThisKind.map((x: Write) => x.confidence),
      );
      filteredWrites.push(
        allWritesOfThisKind.filter(
          (x: Write) =>
            x.confidence == maxConfidence && x.confidence > confidenceThreshold,
        )[0],
      );
    }
  });

  return filteredWrites.filter(
    (f: Write) =>
      f != undefined &&
      !distressedAssets.includes(f.PK.substring(f.PK.indexOf(":") + 1)),
  );
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
          r.redirect.length == 0 || r.redirect[0].PK == r.dbEntry.PK
            ? undefined
            : r.redirect[0].PK,
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
  const previousItems: DbEntry[] = await readPreviousValues(items);
  const filteredItems: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[] =
    await checkMovement(items, previousItems);
  await batchWrite(filteredItems, failOnError);
}
async function readPreviousValues(
  items: AWS.DynamoDB.DocumentClient.PutItemInputAttributeMap[],
): Promise<DbEntry[]> {
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
  return await batchGet(queries);
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

  if (errors != "" && !process.env.LLAMA_RUN_LOCAL)
    await sendMessage(errors, process.env.STALE_COINS_ADAPTERS_WEBHOOK!, true);

  return filteredItems;
}
