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

const confidenceThreshold: number = 0.4;

export async function getTokenAndRedirectData(
  tokens: string[],
  chain: string,
  timestamp: number
) {
  if (process.env.DEFILLAMA_SDK_MUTED !== "true") {
    return await getTokenAndRedirectDataFromAPI(tokens, chain, timestamp);
  }
  return await getTokenAndRedirectDataDB(
    tokens,
    chain,
    timestamp == 0 ? getCurrentUnixTimestamp() : timestamp
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
  confidence = Math.max(Number(confidence), 0.9);
  if (timestamp == 0) {
    if (price != undefined)
      writes.push({
        SK: getCurrentUnixTimestamp(),
        PK: `asset#${chain}:${chain == "solana" ? token : token.toLowerCase()}`,
        price,
        confidence
      });
    writes.push({
      SK: 0,
      PK: `asset#${chain}:${chain == "solana" ? token : token.toLowerCase()}`,
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
      confidence
    });
  } else {
    if (timestamp > 10000000000 || timestamp < 1400000000) {
      new Error("timestamp should be in unix seconds");
    }
    writes.push({
      SK: timestamp,
      PK: `asset#${chain}:${chain == "solana" ? token : token.toLowerCase()}`,
      price,
      confidence
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
  timestamp: number
) {
  let allReads: any[] = [];
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
          43200 // SEARCHES A 24 HOUR WINDOW
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

    // current redirects
    const redirects: DbQuery[] = latestDbEntries
      .map((d: DbEntry) => {
        if ("redirect" in d) return { PK: d.redirect, SK: timestamp };
        return { PK: "not a token", SK: 0 };
      })
      .filter((d: DbQuery) => d.PK != "not a token");

    const timedRedirects: { [PK: string]: any } = {};
    (await Promise.all(
      redirects.map((r: DbQuery) => {
        return getTVLOfRecordClosestToTimestamp(
          r.PK,
          r.SK,
          43200 // SEARCHES A 24 HOUR WINDOW
        );
      })
    )).map((r: any) => (timedRedirects[r.PK] = r));

    // aggregate
    const results = latestDbEntries
      .map((latestDbEntry: any) => {
        let timedDbEntry = timedDbEntries.find(
          (r: any) => r.PK == latestDbEntry.PK // npm run fillLast Curve
        );

        const addressIndex: number = latestDbEntry.PK.indexOf(":");
        const chainIndex = latestDbEntry.PK.indexOf("#");

        let confidence = timedDbEntry?.confidence;

        if ("redirect" in latestDbEntry) {
          const redirect = timedRedirects[latestDbEntry.redirect];

          if (redirect == null || redirect.price == null) return undefined;
          confidence =
            confidence == undefined && "confidence" in redirect
              ? redirect.confidence
              : undefined;

          return {
            confidence,
            price: redirect.price,
            chain:
              addressIndex == -1
                ? undefined
                : latestDbEntry.PK.substring(chainIndex + 1, addressIndex),
            address:
              addressIndex == -1
                ? latestDbEntry.PK
                : latestDbEntry.PK.substring(addressIndex + 1),
            SK: timedDbEntry == undefined ? redirect.SK : timedDbEntry.SK,
            decimals: latestDbEntry.decimals,
            symbol: latestDbEntry.symbol,
            redirect: latestDbEntry.redirect
          };
        } else {
          if (timedDbEntry == null || timedDbEntry.price == null) return;
          return {
            confidence,
            price: timedDbEntry.price,
            chain:
              addressIndex == -1
                ? undefined
                : latestDbEntry.PK.substring(chainIndex + 1, addressIndex),
            address:
              addressIndex == -1
                ? latestDbEntry.PK
                : latestDbEntry.PK.substring(addressIndex + 1),
            SK: timedDbEntry.SK,
            decimals: latestDbEntry.decimals,
            symbol: latestDbEntry.symbol
          };
        }
      })
      .filter((r: any) => r != undefined);

    allReads.push(...results);
  }
  return allReads;
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
      const chosenWrite = allWritesOfThisKind.find(
        (x: Write) =>
          x.confidence == maxConfidence && x.confidence > confidenceThreshold
      );
      if (chosenWrite != null) filteredWrites.push(chosenWrite);
    }
  });

  return filteredWrites.filter((f: Write) => f != undefined);
}
