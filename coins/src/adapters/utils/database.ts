import { batchGet, batchWrite } from "../../utils/shared/dynamodb";

interface write {
  SK: number;
  PK: string;
  price: number | undefined;
  symbol: string;
  decimals: number;
  redirect: string | undefined;
}
export async function getTokenAndRedirectData(tokens: string[], chain: string) {
  const dbEntries = await batchGet(
    tokens.map((t: string) => ({
      PK: `asset#${chain}:${t}`,
      SK: 0
    }))
  );
  const redirects = [];
  for (let i = 0; i < dbEntries.length; i++) {
    if (!("redirect" in dbEntries[i])) continue;
    redirects.push({
      PK: dbEntries[i].redirect,
      SK: 0
    });
  }
  const redirectResults = await batchGet(redirects);

  return dbEntries.map((d) => ({
    dbEntry: d,
    redirect: d.redirect
      ? redirectResults.filter((r) => r.PK == d.redirect)[0]
      : undefined
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
        SK: Date.now(),
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
        redirect
      }
    ]
  );
}
