import { getCurrentUnixTimestamp } from "../../utils/date";
import { batchGet } from "../../utils/shared/dynamodb";
import { write, dbEntry, redirect, dbQuery } from "./dbInterfaces";
export async function getTokenAndRedirectData(tokens: string[], chain: string) {
  const dbEntries: dbEntry[] = await batchGet(
    tokens.map((t: string) => ({
      PK: `asset#${chain}:${t}`,
      SK: 0
    }))
  );
  const redirects: dbQuery[] = [];
  for (let i = 0; i < dbEntries.length; i++) {
    if (!("redirect" in dbEntries[i])) continue;
    redirects.push({
      PK: dbEntries[i].redirect,
      SK: 0
    });
  }
  const redirectResults: redirect[] = await batchGet(redirects);

  return dbEntries.map((d) => ({
    dbEntry: d,
    redirect: redirectResults.filter((r) => r.PK == d.redirect)
  }));
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
        ...(price !== undefined?{
          timestamp: getCurrentUnixTimestamp()
        }:{})
      }
    ]
  );
}
