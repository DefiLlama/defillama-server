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
  if (timestamp == 0) {
    return await getTokenAndRedirectDataCurrent(tokens, chain, 0);
  } else {
    return await getTokenAndRedirectDataDB(tokens, chain, timestamp);
  }
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
      price,
      symbol,
      decimals: Number(decimals),
      redirect,
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
async function getTokenAndRedirectDataCurrent(
  tokens: string[],
  chain: string,
  timestamp: number
) {
  const dbEntries: DbEntry[] = await batchGet(
    tokens.map((t: string) => ({
      PK: `asset#${chain}:${t.toLowerCase()}`,
      SK: timestamp
    }))
  );
  const redirects: DbQuery[] = [];
  for (let i = 0; i < dbEntries.length; i++) {
    if (!("redirect" in dbEntries[i])) continue;
    redirects.push({
      PK: dbEntries[i].redirect,
      SK: timestamp
    });
  }
  const redirectResults: Redirect[] = await batchGet(redirects);

  const reads: Read[] = dbEntries.map((d) => ({
    dbEntry: d,
    redirect: redirectResults.filter((r) => r.PK == d.redirect)
  }));
  return aggregateTokenAndRedirectData(reads);
}
async function getTokenAndRedirectDataDB(
  tokens: string[],
  chain: string,
  timestamp: number
) {
  // timestamped origin entries
  let timedDbEntries: any[] = await Promise.all(
    tokens.map((t: string) => {
      return getTVLOfRecordClosestToTimestamp(
        `asset#${chain}:${t.toLowerCase()}`,
        timestamp,
        43200 // SEARCHES A 24 HOUR WINDOW
      );
    })
  );

  // current origin entries
  const latestDbEntries: DbEntry[] = await batchGet(
    tokens.map((t: string) => ({
      PK: `asset#${chain}:${t.toLowerCase()}`,
      SK: 0
    }))
  );

  // current redirects
  const redirects: DbQuery[] = latestDbEntries.map((d: DbEntry) => {
    const selectedEntries: any[] = timedDbEntries.filter(
      (t: any) => d.PK == t.PK
    );
    if (!("redirect" in d) && selectedEntries.length == 0) {
      return { PK: "not a token", SK: 0 };
    } else if (selectedEntries.length == 0) {
      return { PK: d.redirect, SK: timestamp };
    } else {
      return { PK: selectedEntries[0].PK, SK: timestamp };
    }
  });

  let timedRedirects: any[] = await Promise.all(
    redirects.map((r: DbQuery) => {
      return getTVLOfRecordClosestToTimestamp(
        r.PK,
        r.SK,
        43200 // SEARCHES A 24 HOUR WINDOW
      );
    })
  );

  // aggregate
  const allResults = timedRedirects.map((tr: any) => {
    if (tr.PK == undefined) return { redirect: [{ SK: undefined }] };
    let dbEntry = timedDbEntries.filter((td: any) => tr.PK.includes(td.PK))[0];
    const latestDbEntry = latestDbEntries.filter(
      (ld: any) => tr.PK == ld.redirect
    )[0];
    if (dbEntry == undefined) {
      dbEntry = {
        PK: latestDbEntry.PK,
        decimals: latestDbEntry.decimals,
        symbol: latestDbEntry.symbol
      };
    }
    return {
      dbEntry,
      redirect: [tr]
    };
  });

  // remove faulty data and return
  const validResults: any[] = [];
  for (let i = 0; i < allResults.length; i++) {
    if (
      allResults[i].redirect[0].SK != undefined ||
      allResults[i].dbEntry != undefined
    ) {
      validResults.push(allResults[i]);
    }
  }

  const timestampedResults = aggregateTokenAndRedirectData(validResults);

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
  const coinData: CoinData[] = reads.map((r: Read) => {
    const addressIndex: number = r.dbEntry.PK.indexOf(":");
    const chainIndex = r.dbEntry.PK.indexOf("#");

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
      price: r.redirect.length != 0 ? r.redirect[0].price : r.dbEntry.price,
      timestamp: r.dbEntry.SK == 0 ? getCurrentUnixTimestamp() : r.dbEntry.SK,
      redirect:
        r.redirect.length == 0 || r.redirect[0].PK == r.dbEntry.PK
          ? undefined
          : r.redirect[0].PK,
      confidence
    };
  });

  return coinData;
}
