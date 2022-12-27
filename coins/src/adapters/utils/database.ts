require("dotenv").config();
import axios from "axios";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { batchGet } from "../../utils/shared/dynamodb";
import getTVLOfRecordClosestToTimestamp from "../../utils/shared/getRecordClosestToTimestamp";
import {
  Write,
  DbEntry,
  Redirect,
  DbQuery,
  Read,
  CoinData
} from "./dbInterfaces";

const confidenceThreshold: number = 0.3;

export async function getTokenAndRedirectData(
  tokens: string[],
  chain: string,
  timestamp: number,
  hoursRange: number = 12
) {
  if (process.env.DEFILLAMA_SDK_MUTED !== "true") {
    return await getTokenAndRedirectDataFromAPI(tokens, chain, timestamp);
  }
  return await getTokenAndRedirectDataDB(
    tokens,
    chain,
    timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
    hoursRange
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
  redirect: string | undefined = undefined
) {
  if (timestamp == 0) {
    writes.push(
      ...[
        {
          SK: getCurrentUnixTimestamp(),
          PK: `asset#${chain}:${
            chain == "solana" ? token : token.toLowerCase()
          }`,
          price,
          symbol,
          decimals: Number(decimals),
          redirect,
          confidence: Number(confidence)
        },
        {
          SK: 0,
          PK: `asset#${chain}:${
            chain == "solana" ? token : token.toLowerCase()
          }`,
          price,
          symbol,
          decimals: Number(decimals),
          redirect,
          ...(price !== undefined
            ? {
                timestamp: getCurrentUnixTimestamp()
              }
            : {}),
          adapter,
          confidence: Number(confidence)
        }
      ]
    );
  } else {
    if (timestamp > 10000000000 || timestamp < 1400000000) {
      new Error("timestamp should be in unix seconds");
    }
    writes.push({
      SK: timestamp,
      PK: `asset#${chain}:${chain == "solana" ? token : token.toLowerCase()}`,
      symbol,
      decimals: Number(decimals),
      redirect,
      price,
      confidence: Number(confidence)
    });
  }
}
async function getTokenAndRedirectDataFromAPI(
  tokens: string[],
  chain: string,
  timestamp: number
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
  hoursRange: number
) {
  let allReads: Read[] = [];
  const batchSize = 500;

  for (let lower = 0; lower < tokens.length; lower += batchSize) {
    const upper =
      lower + batchSize > tokens.length ? tokens.length : lower + batchSize;
    // timestamped origin entries
    let timedDbEntries: any[] = await Promise.all(
      tokens.slice(lower, upper).map((t: string) => {
        return getTVLOfRecordClosestToTimestamp(
          `asset#${chain}:${t.toLowerCase()}`,
          timestamp,
          hoursRange * 60 * 60
        );
      })
    );

    // current origin entries, for current redirects
    const latestDbEntries: DbEntry[] = await batchGet(
      tokens.slice(lower, upper).map((t: string) => ({
        PK: `asset#${chain}:${t.toLowerCase()}`,
        SK: 0
      }))
    );

    // current redirect links
    const redirects: DbQuery[] = latestDbEntries.map((d: DbEntry) => {
      const selectedEntries: any[] = timedDbEntries.filter(
        (t: any) => d.PK == t.PK
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
          hoursRange * 60 * 60
        );
      })
    );

    // aggregate
    let validResults: Read[] = latestDbEntries.map((ld: DbEntry, i: number) => {
      if (timedRedirects[i] == undefined) return { dbEntry: ld, redirect: [] };
      return { dbEntry: ld, redirect: [timedRedirects[i]] };
    });

    allReads.push(...validResults);
  }
  const timestampedResults = aggregateTokenAndRedirectData(allReads);

  // if (timestampedResults.length < tokens.length) {
  //   const returnedTokens = timestampedResults.map((t: any) => t.address);
  //   const missingTokens: string[] = [];

  //   tokens.map((t: any) => {
  //     if (returnedTokens[t] == undefined) {
  //       missingTokens.push(t);
  //     }
  //   });

  //   const currentResults = await getTokenAndRedirectData(
  //     missingTokens,
  //     chain,
  //     getCurrentUnixTimestamp()
  //   );

  //   if (currentResults.length > 0) {
  //     await currentResult.adapter()
  //   }
  // }
  return timestampedResults;
}
export function filterWritesWithLowConfidence(allWrites: Write[]) {
  allWrites = allWrites.filter((w: Write) => w != undefined);
  const filteredWrites: Write[] = [];
  const checkedWrites: Write[] = [];

  allWrites.map((w: Write) => {
    let checkedWritesOfThisKind = checkedWrites.filter(
      (x: Write) =>
        x.PK == w.PK &&
        (((x.SK < w.SK + 1000 || x.SK > w.SK + 1000) &&
          w.SK != 0 &&
          x.SK != 0) ||
          (x.SK == 0 && w.SK == 0))
    );

    if (checkedWritesOfThisKind.length > 0) return;
    checkedWrites.push(w);

    let allWritesOfThisKind = allWrites.filter(
      (x: Write) =>
        x.PK == w.PK &&
        (((x.SK < w.SK + 1000 || x.SK > w.SK + 1000) &&
          w.SK != 0 &&
          x.SK != 0) ||
          (x.SK == 0 && w.SK == 0))
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
        allWritesOfThisKind.map((x: Write) => x.confidence)
      );
      filteredWrites.push(
        allWritesOfThisKind.filter(
          (x: Write) =>
            x.confidence == maxConfidence && x.confidence > confidenceThreshold
        )[0]
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
          r.redirect.length == 0 || r.redirect[0].PK == r.dbEntry.PK
            ? undefined
            : r.redirect[0].PK,
        confidence
      };
    })
    .filter((d: CoinData) => d.price != -1);

  return coinData;
}
