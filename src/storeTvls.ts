import dynamodb from "./utils/dynamodb";
import { wrapScheduledLambda } from "./utils/wrap";
import protocols, { Protocol } from "./protocols/data";
import { secondsBetweenCalls } from './utils/date'
import * as Sentry from '@sentry/serverless'
import { ethers } from 'ethers'
import { util } from '@defillama/sdk'

const maxRetries = 4;
const concurrentActions = 2;
const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5 // 1.5 to add some wiggle room
const secondsInDay = 60 * 60 * 24;
const secondsInWeek = secondsInDay * 7;

function getDay(timestamp: number | undefined): number {
  if (timestamp == undefined) {
    return -1;
  }
  var dt = new Date(timestamp * 1000);
  return dt.getDay()
}

const locks = [] as ((value: unknown) => void)[];
function getCoingeckoLock() {
  return new Promise((resolve) => {
    locks.push(resolve)
  })
}
function releaseCoingeckoLock() {
  const firstLock = locks.shift();
  if (firstLock !== undefined) {
    firstLock(null);
  }
}

function getTimestampAtStartOfDay(timestamp: number) {
  var dt = new Date(timestamp * 1000);
  dt.setHours(0);
  dt.setMilliseconds(0);
  dt.setMinutes(0);
  dt.setSeconds(0);
  return Math.floor(dt.getTime() / 1000);
}

function getTVLOfRecordClosestToTimestamp(PK: string, timestamp: number) {
  return dynamodb.query({
    ExpressionAttributeValues: {
      ':pk': PK,
      ':begin': timestamp - secondsBetweenCallsExtra,
      ':end': timestamp + secondsBetweenCallsExtra,
    },
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :begin AND :end',
  }).then(records => {
    if (records.Items == undefined || records.Items.length == 0) {
      return {
        SK: undefined,
        tvl: 0
      }
    }
    let closest = records.Items[0]
    for (const item of records.Items.slice(1)) {
      if (Math.abs(item.SK - timestamp) < Math.abs(closest.SK - timestamp)) {
        closest = item;
      }
    }
    return closest;
  });
}

interface TokenPrices {
  [token: string]: {
    usd: number
  }
}

async function storeTvl(unixTimestamp: number, ethBlock: number, protocol: Protocol, knownTokenPrices: TokenPrices) {
  for (let i = 0; i < maxRetries; i++) {
    let tvl: number;
    try {
      const module = await import(`../DefiLlama-Adapters/projects/${protocol.module}`)
      if (module.tvl) {
        const tvlBalances = await module.tvl(unixTimestamp, ethBlock);
        tvl = await util.computeTVL(tvlBalances, 'now', false, knownTokenPrices, getCoingeckoLock, 10);
      } else if (module.fetch) {
        tvl = Number(await module.fetch());
      } else {
        throw new Error(`Module for ${protocol.name} does not have a normal interface`)
      }
      if (typeof tvl !== 'number' || Number.isNaN(tvl)) {
        throw new Error(`TVL of ${protocol.name} is not a number, instead it is ${tvl}`)
      }
    } catch (e) {
      if (i >= maxRetries - 1) {
        console.error(protocol.name, e);
        Sentry.AWSLambda.captureException(e);
        return;
      } else {
        continue;
      }
    }
    const hourlyPK = `hourlyTvl#${protocol.id}`
    const lastHourlyTVLRecord = getTVLOfRecordClosestToTimestamp(hourlyPK, unixTimestamp);
    const lastDailyTVLRecord = getTVLOfRecordClosestToTimestamp(hourlyPK, unixTimestamp - secondsInDay)
    const lastWeeklyTVLRecord = getTVLOfRecordClosestToTimestamp(hourlyPK, unixTimestamp - secondsInWeek)
    //console.log(protocol.name, tvl, (await lastHourlyTVLRecord).tvl, (await lastDailyTVLRecord).tvl, (await lastWeeklyTVLRecord).tvl)
    await dynamodb.put({
      PK: hourlyPK,
      SK: unixTimestamp,
      tvl,
      tvlPrev1Hour: (await lastHourlyTVLRecord).tvl,
      tvlPrev1Day: (await lastDailyTVLRecord).tvl,
      tvlPrev1Week: (await lastWeeklyTVLRecord).tvl
    });
    if (getDay((await lastHourlyTVLRecord)?.SK) !== getDay(unixTimestamp)) {
      // First write of the day
      await dynamodb.put({
        PK: `dailyTvl#${protocol.id}`,
        SK: getTimestampAtStartOfDay(unixTimestamp),
        tvl,
      })
    }
    return;
  }
}

const handler = async () => {
  const provider = new ethers.providers.AlchemyProvider(
    "mainnet",
    process.env.ALCHEMY_API
  );
  const lastBlockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(lastBlockNumber - 10); // To allow indexers to catch up
  const knownTokenPrices = {}
  const actions = protocols.map(protocol =>
    storeTvl(block.timestamp, block.number, protocol, knownTokenPrices)
  )
  const timer = setInterval(() => {
    // Rate limit is 100 calls/min for coingecko's API
    // So we'll release one every 0.6 seconds to match it
    releaseCoingeckoLock()
  }, 600)
  await Promise.all(actions);
  clearInterval(timer);
  return;
};

export default wrapScheduledLambda(handler);
