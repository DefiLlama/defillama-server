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

export async function fetchHistoricalFromDB(chain: string | undefined = undefined, isRaw: boolean = false) {
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

  if (isRaw) return data;

  const symbolMap: { [key: string]: string } = await getR2JSONString("chainAssetsSymbolMap");

  const symbolData: any[] = [];
  data.map((d: any) => {
    const symbolEntry: any = { timestamp: d.timestamp };
    Object.keys(d).forEach((chain: string) => {
      if (chain == "timestamp") return;
      const readableChain = getChainDisplayName(chain, true);
      symbolEntry[readableChain] = {};
      Object.keys(d[chain]).map((section) => {
        symbolEntry[readableChain][section] = { total: d[chain][section].total, breakdown: {} };
        Object.keys(d[chain][section].breakdown).forEach((asset: string) => {
          if (!symbolMap[asset]) {
            console.log(`${asset} not found in symbolMap`);
            return;
          }
          symbolEntry[readableChain][section].breakdown[symbolMap[asset]] = d[chain][section].breakdown[asset];
        });
      });
    });
    symbolData.push(symbolEntry);
  });

  return symbolData;
}

export async function fetchChartData(chain: string) {
    const allHistorical = await fetchHistoricalFromDB(chain)
    const chartData: any[] = []
    allHistorical.map((h: any) => {
        const entry: any = { timestamp: h.timestamp }
        Object.keys(h).map((chain: string) => {
            if (chain == "timestamp") return;
            const totalsOnly: { [key: string]: string } = {}
            Object.keys(h[chain]).map((section: string) => {
                totalsOnly[section] = h[chain][section].total
            })
            entry[chain] = totalsOnly
        })
        chartData.push(entry)
    })
    return chartData
}

export function findDailyTimestamps(timestamps: { timestamp: number }[]): number[] {
  const end = getTimestampAtStartOfDay(getCurrentUnixTimestamp());

  const start = getTimestampAtStartOfDay(timestamps[timestamps.length - 1].timestamp + secondsInADay);
  const dailyTimestamps = [timestamps[timestamps.length - 1].timestamp];

  for (let i = start; i < end; i += secondsInADay) {
    const timestamp = timestamps.reduce((prev, curr) =>
      Math.abs(curr.timestamp - i) < Math.abs(prev.timestamp - i) ? curr : prev
    );
    dailyTimestamps.push(timestamp.timestamp);
  }
  return dailyTimestamps;
}

export async function fetchFlows(period: number = secondsInADay) {
  const sql = await iniDbConnection();
  const targetEnd = getCurrentUnixTimestamp();
  const targetStart = targetEnd - period * 1.5;
  const datas: any[] = await queryPostgresWithRetry(
    sql`select * from chainassets2 where timestamp > ${targetStart}`,
    sql
  );

  const actualStart = datas.reduce((prev, curr) =>
    Math.abs(curr.timestamp - targetStart) < Math.abs(prev.timestamp - targetStart) ? curr : prev
  );
  const actualEnd = datas.reduce((prev, curr) =>
    Math.abs(curr.timestamp - targetEnd) < Math.abs(prev.timestamp - targetEnd) ? curr : prev
  );

  const startData = JSON.parse(datas.find((d) => d.timestamp == actualStart.timestamp)?.value ?? "{}");
  const endData = JSON.parse(datas.find((d) => d.timestamp == actualEnd.timestamp)?.value ?? "{}");

  const flows: any = {};
  Object.keys(endData).map((chain) => {
    const readableChain = getChainDisplayName(chain, true);
    flows[readableChain] = {};
    Object.keys(endData[chain]).map((section) => {
      flows[readableChain][section] = {};
      const startValue = startData[chain]?.[section]?.total ?? 0;
      const endValue = endData[chain][section].total;
      const raw = endValue - startValue;
      const perc = (raw / startValue) * 100;
      flows[readableChain][section].raw = raw;
      flows[readableChain][section].perc = perc;
    });
  });

  return flows;
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
