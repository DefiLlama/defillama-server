import postgres from "postgres";
import { secondsInDay } from "../../src/utils/date";
import { queryPostgresWithRetry } from "../../src/utils/shared/bridgedTvlPostgres";
import { coins } from "@defillama/sdk";
import BigNumber from "bignumber.js";

let auth: string[] = [];
async function iniDbConnection() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there aren't 3 auth params");

  return postgres(auth[0], { idle_timeout: 90 });
}

const period = secondsInDay;

export default async function calculateFlows(endTimestamp: number) {
  const startTimestamp = endTimestamp - period;
  const { startData, endData } = await getDBData(startTimestamp, endTimestamp);

  const startCoinKeys = getCoinKeys(startData, []);
  const allCoinKeys = getCoinKeys(endData, startCoinKeys);

  const startCoinPrices = await coins.getPrices(allCoinKeys, startTimestamp);
  const endCoinPrices = await coins.getPrices(allCoinKeys, endTimestamp);

  const store: any = {};
  Object.keys(endData).map((chain) => {
    store[chain] = {}
    Object.keys(endData[chain].total.breakdown).map((asset) => {
      if (!startData[chain]) return;
      if (!startCoinPrices[asset] || !endCoinPrices[asset]) return;

      const startPrice = startCoinPrices[asset].price ?? 0;
      const endPrice = endCoinPrices[asset].price ?? 0;
      if (startPrice == 0 || endPrice == 0) return;

      const startValue = startData[chain].total.breakdown[asset];
      const endValue = endData[chain].total.breakdown[asset];

      const startAmount = startValue ? startValue / startPrice : 0;
      const endAmount = endValue / endPrice;

      const inflow = endAmount - startAmount;
      if (inflow < 1) return;

      const symbol = endCoinPrices[asset].symbol;

      if (!store[chain][symbol]) store[chain][symbol] = BigNumber(0);
      store[chain][symbol] = store[chain][symbol].plus(inflow);
    });
  });

  Object.keys(startData).map((chain) => {
    Object.keys(startData[chain].total.breakdown).map((asset) => {
      if (endData[chain].total.breakdown[asset]) return;
      if (!startCoinPrices[asset]) return;

      const startPrice = startCoinPrices[asset].price ?? 0;
      if (startPrice == 0) return;

      const startAmount = startData[chain].total.breakdown[asset] / startPrice;
      if (startAmount < 1) return;

      const symbol = startCoinPrices[asset].symbol;
      if (!store[chain][symbol]) store[chain][symbol] = BigNumber(0);
      store[chain][symbol] = store[chain][symbol].minus(startAmount);
    });
  });

  return store;
}

async function getDBData(startTimestamp: number, endTimestamp: number) {
  const sql = await iniDbConnection();

  const timestamps: any[] = await queryPostgresWithRetry(sql`select timestamp from chainassets2`, sql);

  const actualStart = timestamps.reduce((prev, curr) =>
    Math.abs(curr.timestamp - startTimestamp) < Math.abs(prev.timestamp - startTimestamp) ? curr : prev
  );
  const actualEnd = timestamps.reduce((prev, curr) =>
    Math.abs(curr.timestamp - endTimestamp) < Math.abs(prev.timestamp - endTimestamp) ? curr : prev
  );

  const datas: any[] = await queryPostgresWithRetry(
    sql`select * from chainassets2 where timestamp in ${sql([actualStart.timestamp, actualEnd.timestamp])}`,
    sql
  );

  const startData = JSON.parse(datas.find((d) => d.timestamp == actualStart.timestamp)?.value);
  const endData = JSON.parse(datas.find((d) => d.timestamp == actualEnd.timestamp)?.value);

  if (!startData || !endData) throw new Error("startData or endData not found");

  return { startData, endData, actualStart, actualEnd };
}

function getCoinKeys(data: any, coinKeys: string[]) {
  Object.keys(data).map((chain: string) =>
    Object.keys(data[chain]?.total?.breakdown ?? {}).map((asset) => {
      if (coinKeys.includes(asset)) return;
      coinKeys.push(asset);
    })
  );

  return coinKeys;
}