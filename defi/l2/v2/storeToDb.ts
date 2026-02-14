// timestamp, value

import postgres from "postgres";
import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay } from "../../src/utils/date";
import { getR2JSONString } from "../../src/utils/r2";
import { getChainDisplayName } from "../../src/utils/normalizeChain";

let auth: string[] = [];
const secondsInADay = 86400;
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

  // delete old hourly datas here??
  sql.end();
}

export async function fetchHistoricalFromDB(
  chain: string | undefined = undefined,
  isRaw: boolean = false,
  breakdown: boolean = false
) {
  const sql = await iniDbConnection();

  const timestamps = await queryPostgresWithRetry(sql`select timestamp from chainassets2`, sql);
  const dailyEntries = findDailyTimestamps(timestamps);
  const dailyData = await queryPostgresWithRetry(
    sql`select * from chainassets2 where timestamp in ${sql(dailyEntries)}`,
    sql
  );
  sql.end();

  const data = chain
    ? dailyData.map((d: any) => ({ timestamp: d.timestamp, [chain]: JSON.parse(d.value)[chain] }))
    : dailyData.map((d: any) => ({ timestamp: d.timestamp, ...JSON.parse(d.value) }));

  data.sort((a: any, b: any) => a.timestamp - b.timestamp);
  if (isRaw) return data;

  if (!breakdown) {
    const totalsData: any[] = [];
    data.map((d: any) => {
      const totalsEntry: any = { timestamp: d.timestamp, data: {} };
      Object.keys(d).forEach((c: string) => {
        if (!c || c == "timestamp") return;
        if (chain) {
          Object.keys(d[chain]).map((section) => {
            totalsEntry.data[section] = d[chain][section].total;
          });
        } else {
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

  const symbolMap: { [key: string]: string } = await getR2JSONString("chainAssetsSymbolMap");

  const symbolData: any[] = [];
  data.map((d: any) => {
    const symbolEntry: any = { timestamp: d.timestamp, data: {} };
    Object.keys(d).forEach((c: string) => {
      if (!c || c == "timestamp") return;
      if (chain) {
        Object.keys(d[chain]).map((section) => {
          symbolEntry.data[section] = { total: d[c][section].total, breakdown: {} };
          Object.keys(d[c][section].breakdown ?? {}).forEach((asset: string) => {
            if (!symbolMap[asset]) {
              // console.log(`${asset} not found in symbolMap`);
              return;
            }
            symbolEntry.data[section].breakdown[symbolMap[asset]] = d[c][section].breakdown[asset];
          });
        });
      } else {
        const readableChain = getChainDisplayName(c, true);
        symbolEntry.data[readableChain] = {};
        Object.keys(d[c]).map((section) => {
          symbolEntry.data[readableChain][section] = { total: d[c][section].total, breakdown: {} };
          Object.keys(d[c][section].breakdown ?? {}).forEach((asset: string) => {
            if (!symbolMap[asset]) {
              // console.log(`${asset} not found in symbolMap`);
              return;
            }
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
  const allHistorical = await fetchHistoricalFromDB(chain);
  const chartData: any[] = [];
  allHistorical.map((h: any) => {
    const entry: any = { timestamp: h.timestamp };
    Object.keys(h).map((chain: string) => {
      if (chain == "timestamp") return;
      const totalsOnly: { [key: string]: string } = {};
      Object.keys(h[chain]).map((section: string) => {
        totalsOnly[section] = h[chain][section].total;
      });
      entry[chain] = totalsOnly;
    });
    chartData.push(entry);
  });
  return chartData;
}

export function findDailyTimestamps(timestamps: { timestamp: number }[]): number[] {
  timestamps.sort((a, b) => a.timestamp - b.timestamp);
  const end = getTimestampAtStartOfDay(getCurrentUnixTimestamp());
  const start = getTimestampAtStartOfDay(Number(timestamps[0].timestamp) + secondsInADay);
  const dailyTimestamps = [timestamps[timestamps.length - 1].timestamp];

  for (let i = start; i < end; i += secondsInADay) {
    const timestamp = timestamps.reduce((prev, curr) =>
      Math.abs(curr.timestamp - i) < Math.abs(prev.timestamp - i) ? curr : prev
    );
    dailyTimestamps.push(timestamp.timestamp);
  }
  return dailyTimestamps;
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
