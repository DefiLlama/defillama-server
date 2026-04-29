// timestamp, value

import postgres from "postgres";
import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { getR2JSONString } from "../../src/utils/r2";
import { getChainDisplayName } from "../../src/utils/normalizeChain";
import {
  storeChainHistory,
  readChainHistory,
  storeAllChainsHistory,
  readAllChainsHistory,
} from "./file-cache";

let auth: string[] = [];
const columns: any = ["timestamp", "value"];
async function iniDbConnection() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

  return postgres(auth[0], { idle_timeout: 90 });
}

export async function storeHistoricalToDB(res: { timestamp: number; value: any }) {
  const write: { timestamp: string; value: string } = {
    timestamp: res.timestamp.toFixed(),
    value: JSON.stringify(res.value),
  };
  const sql = await iniDbConnection();

  await queryPostgresWithRetry(
    sql`
        insert into chainassets2
        ${sql([write], ...columns)}
        `,
    sql
  );
  sql.end();

  await precomputeHistoricalCache();
}

// precompute all-chains and per-chain totals into file cache after each DB store
async function precomputeHistoricalCache() {
  const sql = await iniDbConnection();
  const rows = await queryPostgresWithRetry(
    sql`
      select distinct on (date_trunc('day', to_timestamp(timestamp)))
        timestamp, value
      from chainassets2
      order by date_trunc('day', to_timestamp(timestamp)) asc, timestamp desc
    `,
    sql
  );
  sql.end();

  rows.sort((a: any, b: any) => a.timestamp - b.timestamp);

  const allChainsTotals: any[] = [];
  const perChainTotals: { [chain: string]: any[] } = {};

  rows.map((row: any) => {
    const value = JSON.parse(row.value);
    const allEntry: any = { timestamp: row.timestamp, data: {} };

    Object.keys(value).map((c: string) => {
      if (!value[c]) return;
      const readableChain = getChainDisplayName(c, true);
      allEntry.data[readableChain] = {};
      Object.keys(value[c]).map((section: string) => {
        allEntry.data[readableChain][section] = value[c][section]?.total;
      });

      if (!perChainTotals[c]) perChainTotals[c] = [];
      const chainEntry: any = { timestamp: row.timestamp, data: {} };
      Object.keys(value[c]).map((section: string) => {
        chainEntry.data[section] = value[c][section]?.total;
      });
      perChainTotals[c].push(chainEntry);
    });

    allChainsTotals.push(allEntry);
  });

  await Promise.all([
    storeAllChainsHistory(allChainsTotals),
    ...Object.keys(perChainTotals).map((chain) => storeChainHistory(chain, perChainTotals[chain])),
  ]);
}

export async function fetchHistoricalFromDB(
  chain: string | undefined = undefined,
  isRaw: boolean = false,
  breakdown: boolean = false
) {
  // serve from file cache for totals (the common API case)
  if (!isRaw && !breakdown) {
    const cached = chain ? await readChainHistory(chain) : await readAllChainsHistory();
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  }

  const result = await fetchHistoricalFromDBDirect(chain, isRaw, breakdown);

  // Warm the cache on read-path misses so subsequent requests don't re-hit the DB.
  // Totals-only: raw/breakdown responses bypass the cache and aren't stored.
  if (!isRaw && !breakdown && Array.isArray(result) && result.length > 0) {
    try {
      if (chain) await storeChainHistory(chain, result);
      else await storeAllChainsHistory(result);
    } catch (e: any) {
      console.error("cache warm failed:", e?.message);
    }
  }

  return result;
}

async function fetchHistoricalFromDBDirect(
  chain: string | undefined = undefined,
  isRaw: boolean = false,
  breakdown: boolean = false
) {
  const sql = await iniDbConnection();

  const allData = chain
    ? await queryPostgresWithRetry(
        sql`
          select timestamp, value::jsonb->${chain} as chain_value
          from (
            select distinct on (date_trunc('day', to_timestamp(timestamp)))
              timestamp, value
            from chainassets2
            order by date_trunc('day', to_timestamp(timestamp)) asc, timestamp desc
          ) daily
          order by timestamp asc
        `,
        sql
      )
    : await queryPostgresWithRetry(
        sql`
          select distinct on (date_trunc('day', to_timestamp(timestamp)))
            timestamp, value
          from chainassets2
          order by date_trunc('day', to_timestamp(timestamp)) asc, timestamp desc
        `,
        sql
      );
  sql.end();

  const data = chain
    ? allData.filter((d: any) => d.chain_value != null).map((d: any) => ({ timestamp: d.timestamp, [chain]: d.chain_value }))
    : allData.map((d: any) => ({ timestamp: d.timestamp, ...JSON.parse(d.value) }));

  data.sort((a: any, b: any) => a.timestamp - b.timestamp);
  if (isRaw) return data;

  if (!breakdown) {
    const totalsData: any[] = [];
    data.map((d: any) => {
      const totalsEntry: any = { timestamp: d.timestamp, data: {} };
      Object.keys(d).forEach((c: string) => {
        if (!c || c == "timestamp") return;
        if (chain) {
          if (!d[chain]) return;
          Object.keys(d[chain]).map((section) => {
            totalsEntry.data[section] = d[chain][section].total;
          });
        } else {
          if (!d[c]) return;
          const readableChain = getChainDisplayName(c, true);
          totalsEntry.data[readableChain] = {};
          Object.keys(d[c]).map((section) => {
            totalsEntry.data[readableChain][section] = d[c][section].total;
          });
        }
      });

      totalsData.push(totalsEntry);
    });

    return totalsData;
  }

  const symbolMap: { [key: string]: string } = (await getR2JSONString("chainAssetsSymbolMap")) ?? {};

  const symbolData: any[] = [];
  data.map((d: any) => {
    const symbolEntry: any = { timestamp: d.timestamp, data: {} };
    Object.keys(d).forEach((c: string) => {
      if (!c || c == "timestamp") return;
      if (chain) {
        if (!d[chain]) return;
        Object.keys(d[chain]).map((section) => {
          symbolEntry.data[section] = { total: d[chain][section].total, breakdown: {} };
          Object.keys(d[chain][section].breakdown ?? {}).forEach((asset: string) => {
            if (!symbolMap[asset]) return;
            symbolEntry.data[section].breakdown[symbolMap[asset]] = d[chain][section].breakdown[asset];
          });
        });
      } else {
        if (!d[c]) return;
        const readableChain = getChainDisplayName(c, true);
        symbolEntry.data[readableChain] = {};
        Object.keys(d[c]).map((section) => {
          symbolEntry.data[readableChain][section] = { total: d[c][section].total, breakdown: {} };
          Object.keys(d[c][section].breakdown ?? {}).forEach((asset: string) => {
            if (!symbolMap[asset]) return;
            symbolEntry.data[readableChain][section].breakdown[symbolMap[asset]] = d[c][section].breakdown[asset];
          });
        });
      }
    });

    symbolData.push(symbolEntry);
  });

  return symbolData;
}

export async function fetchChartData(chain: string) {
  return fetchHistoricalFromDB(chain);
}


export async function fetchCurrentChainAssets() {
  const res = await getR2JSONString("chainAssets2");

  const readable: any = { timestamp: res.timestamp };
  Object.keys(res.value).map((chain) => {
    const readableChain = getChainDisplayName(chain, true);
    readable[readableChain] = res.value[chain];
  });

  return readable;
}
// fetchFlows(); // ts-node defi/l2/v2/storeToDb.ts
