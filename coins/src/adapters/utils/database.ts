import { getCurrentUnixTimestamp } from "../../utils/date";
import { batchGet } from "../../utils/shared/dynamodb";
import getTVLOfRecordClosestToTimestamp from "../../utils/shared/getRecordClosestToTimestamp";
import { write, dbEntry, redirect, dbQuery } from "./dbInterfaces";

export async function getTokenAndRedirectData(
  tokens: string[],
  chain: string,
  timestamp: number = 0
) {
  if (timestamp == 0) {
    return await getTokenAndRedirectDataCurrent(tokens, chain, timestamp);
  } else {
    return await getTokenAndRedirectDataHistorical(tokens, chain, timestamp);
  }
}

export function addToDBWritesList(
  writes: write[],
  chain: string,
  token: string,
  price: number | undefined,
  decimals: number,
  symbol: string,
  timestamp: number,
  redirect: string | undefined = undefined
) {
  if (timestamp == 0) {
    writes.push(
      ...[
        {
          SK: getCurrentUnixTimestamp(),
          PK: `asset#${chain}:${token}`,
          price,
          symbol,
          decimals,
          redirect
        },
        {
          SK: 0,
          PK: `asset#${chain}:${token}`,
          price,
          symbol,
          decimals,
          redirect,
          ...(price !== undefined
            ? {
                timestamp: getCurrentUnixTimestamp()
              }
            : {})
        }
      ]
    );
  } else {
    if (timestamp > 10000000000 || timestamp < 1400000000) {
      new Error("timestamp should be in unix seconds");
    }
    writes.push({
      SK: timestamp,
      PK: `asset#${chain}:${token}`,
      price,
      symbol,
      decimals,
      redirect
    });
  }
}
async function getTokenAndRedirectDataHistorical(
  tokens: string[],
  chain: string,
  timestamp: number
) {
  // timestamped origin entries
  let timedDbEntries: any[] = await Promise.all(
    tokens.map((t: string) => {
      return getTVLOfRecordClosestToTimestamp(
        `asset#${chain}:${t}`,
        timestamp,
        43200 // SEARCHES A 24 HOUR WINDOW
      );
    })
  );

  // current origin entries
  const latestDbEntries: dbEntry[] = await batchGet(
    tokens.map((t: string) => ({
      PK: `asset#${chain}:${t}`,
      SK: 0
    }))
  );

  // current redirects
  const redirects: dbQuery[] = latestDbEntries.map((d: dbEntry) => {
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
    redirects.map((r: dbQuery) => {
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

  return validResults;
}
async function getTokenAndRedirectDataCurrent(
  tokens: string[],
  chain: string,
  timestamp: number
) {
  const dbEntries: dbEntry[] = await batchGet(
    tokens.map((t: string) => ({
      PK: `asset#${chain}:${t}`,
      SK: timestamp
    }))
  );
  const redirects: dbQuery[] = [];
  for (let i = 0; i < dbEntries.length; i++) {
    if (!("redirect" in dbEntries[i])) continue;
    redirects.push({
      PK: dbEntries[i].redirect,
      SK: timestamp
    });
  }
  const redirectResults: redirect[] = await batchGet(redirects);

  return dbEntries.map((d) => ({
    dbEntry: d,
    redirect: redirectResults.filter((r) => r.PK == d.redirect)
  }));
}
