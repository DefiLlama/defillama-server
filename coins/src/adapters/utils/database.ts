import { getCurrentUnixTimestamp } from "../../utils/date";
import { batchGet } from "../../utils/shared/dynamodb";
import getTVLOfRecordClosestToTimestamp from "../../utils/shared/getRecordClosestToTimestamp";
import getBlock from "./block";
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
  redirect: string | undefined = undefined
) {
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
  // redirects
  const redirects: dbQuery[] = latestDbEntries.map((d: dbEntry) => {
    const i = tokens.indexOf(d.PK.substring(d.PK.indexOf(":") + 1));
    if (!("redirect" in d) && timedDbEntries[i].SK == undefined) {
      return { PK: "not a token", SK: 0 };
    } else {
      const PK =
        timedDbEntries[i].SK == undefined ? d.redirect : timedDbEntries[i].SK;
      return { PK, SK: timestamp };
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
  const allResults = timedRedirects.map((t: any) => {
    const redirect = redirects.filter((r: dbQuery) => r.PK == t.PK)[0];
    const i = redirects.indexOf(redirect);
    let dbEntry = timedDbEntries[i];
    if (i != -1) {
      dbEntry["PK"] = tokens[i];
    }
    return {
      dbEntry: dbEntry,
      redirect: [t]
    };
  });
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
