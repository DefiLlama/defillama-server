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

  data.sort((a: any, b: any) => a.timestamp - b.timestamp);

  if (isRaw) return data;

  const symbolMap: { [key: string]: string } = await getR2JSONString("chainAssetsSymbolMap");

  const symbolData: any[] = [];
  data.map((d: any) => {
    const symbolEntry: any = { timestamp: d.timestamp };
    Object.keys(d).forEach((chain: string) => {
      if (chain == "timestamp") return;
      const readableChain = getChainDisplayName(chain, true);
      if (!chain) symbolEntry[readableChain] = {};
      Object.keys(d[chain]).map((section) => {
        if (!chain) symbolEntry[readableChain][section] = { total: d[chain][section].total, breakdown: {} };
        else symbolEntry[section] = { total: d[chain][section].total, breakdown: {} };
        if (!d[chain][section].breakdown || !Object.keys(d[chain][section].breakdown).length) return;
        Object.keys(d[chain][section].breakdown).forEach((asset: string) => {
          if (!symbolMap[asset]) {
            console.log(`${asset} not found in symbolMap`);
            return;
          }

          if (!chain)
            symbolEntry[readableChain][section].breakdown[symbolMap[asset]] = d[chain][section].breakdown[asset];
          else symbolEntry[section].breakdown[symbolMap[asset]] = d[chain][section].breakdown[asset];
        });
      });
    });
    symbolData.push(symbolEntry);
  });

  return symbolData;
}

export async function fetchChartData(chain: string | undefined = undefined) {
  const allHistorical = await fetchHistoricalFromDB(chain, true);
  const chartData: any[] = [];
  allHistorical.forEach((h: any) => {
    const entry: any = { timestamp: h.timestamp };
    Object.keys(h).forEach((c: string) => {
      if (c == "timestamp") return;

      const totalsOnly: { [key: string]: string } = {};
      Object.keys(h[c]).forEach((section: string) => {
        totalsOnly[section] = h[c][section].total;
      });

      if (!chain) {
        const readableChain = getChainDisplayName(c, true);
        entry.data[readableChain] = totalsOnly;
      } else entry.data = totalsOnly;
    });
    chartData.push(entry);
  });

  return chartData;
}

function findDailyTimestamps(timestamps: { timestamp: number }[]): number[] {
  timestamps.sort((a, b) => a.timestamp - b.timestamp);
  const end = getTimestampAtStartOfDay(getCurrentUnixTimestamp());

  const startTimestampRaw = Number(timestamps[0].timestamp) + secondsInADay;
  const start = getTimestampAtStartOfDay(startTimestampRaw);
  const dailyTimestamps = [timestamps[0].timestamp];

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


// None of this flows below is used 
export async function fetchFlows(period: number = secondsInADay) {
  const sql = await iniDbConnection();
  const targetEnd = getCurrentUnixTimestamp();
  const targetStart = targetEnd - period * 1.5;

  const timestamps: any[] = await queryPostgresWithRetry(sql`select timestamp from chainassets2`, sql);

  const actualStart = timestamps.reduce((prev, curr) =>
    Math.abs(curr.timestamp - targetStart) < Math.abs(prev.timestamp - targetStart) ? curr : prev
  );
  const actualEnd = timestamps.reduce((prev, curr) =>
    Math.abs(curr.timestamp - targetEnd) < Math.abs(prev.timestamp - targetEnd) ? curr : prev
  );

  const datas: any[] = await queryPostgresWithRetry(
    sql`select * from chainassets2 where timestamp in ${sql([actualStart.timestamp, actualEnd.timestamp])}`,
    sql
  );

  const startData = JSON.parse(datas.find((d) => d.timestamp == actualStart.timestamp)?.value ?? "{}");
  const endData = JSON.parse(datas.find((d) => d.timestamp == actualEnd.timestamp)?.value ?? "{}");

  const flows: any = calculateFlows(startData, endData);

  return flows;
}

function calculateFlows(startData: any, endData: any) {
  const flows: any = {};
  Object.keys(endData).forEach((chain) => {
    const readableChain = getChainDisplayName(chain, true);
    flows[readableChain] = {};
    Object.keys(endData[chain]).map((section) => {
      flows[readableChain][section] = {};
      const startValue = startData[chain]?.[section]?.total ?? 0;
      const endValue = endData[chain][section].total;
      const raw = endValue - startValue;
      if (startValue == 0) {
        flows[readableChain][section].perc = Infinity;
        flows[readableChain][section].raw = raw;
        return;
      }
      const perc = (raw / startValue) * 100;
      flows[readableChain][section].raw = raw;
      flows[readableChain][section].perc = perc;
    });
  });
  return flows;
}

export async function fetchHistoricalFlows(chain: string, period: number) {
  if (period != secondsInADay) throw new Error("period must be 24 hours");

  const sql = await iniDbConnection();
  const timestamps: any[] = await queryPostgresWithRetry(sql`select timestamp from chainassets2`, sql);
  const dailyEntries = findDailyTimestamps(timestamps);
  const dailyData = await queryPostgresWithRetry(
    sql`select * from chainassets2 where timestamp in ${sql(dailyEntries)}`,
    sql
  );
  sql.end();

  const data = dailyData.map((d: any) => ({ timestamp: d.timestamp, [chain]: JSON.parse(d.value)[chain] }));

  data.sort((a: any, b: any) => a.timestamp - b.timestamp);

  // const response: any[] = [];
  // for (let i = 0; i < data.length - 1; i++) {
  //   const startData = data[i];
  //   const endData = data[i + 1];
  //   const flows = calculateFlows(startData, endData);
  //   response.push({ timestamp: endData.timestamp, flows });
  // }

  const symbolMap: { [key: string]: string } = await getR2JSONString("chainAssetsSymbolMap");

  for (let i = 0; i < data.length - 1; i++) {
    const startData = data[i];
    const endData = data[i + 1];

    Object.keys(endData[chain]).map((section) => {
      Object.keys(endData[chain][section].breakdown).map((asset) => {
        const symbol = symbolMap[asset];
        if (!symbol) return;
        const startValue = startData[chain]?.[section]?.breakdown?.[asset] ?? 0;
        const endValue = endData[chain][section].breakdown[asset];
        const raw = endValue - startValue;
        // if (startValue == 0) {
        //   flows[readableChain][section].perc = Infinity;
        //   flows[readableChain][section].raw = raw;
        //   return;
        // }
      });
    });
    
  }


  return data;
}