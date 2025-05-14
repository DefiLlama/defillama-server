// exactly same as storeNewTvl.ts but with reads data from postgres instead of dynamodb

import dynamodb from "../utils/shared/dynamodb";
import { Protocol } from "../protocols/data";
import {
  getTimestampAtStartOfDay,
  getDay,
  secondsInDay,
  secondsInWeek,
  HOUR,
} from "../utils/date";
import { hourlyTvl, dailyTvl, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import { reportError } from "../utils/error";
import { TokensValueLocked, tvlsObject } from "../types";
import { util } from "@defillama/sdk";
import { sendMessage } from "../utils/discord";
import { extraSections } from "../utils/normalizeChain";
import { saveProtocolItem, getClosestProtocolItem, getLatestProtocolItem, } from "../api2/db";


const { humanizeNumber: { humanizeNumber, } } = util

function calculateTVLWithAllExtraSections(tvl: tvlsObject<number>) {
  return extraSections.reduce((sum, option) => sum + (tvl[option] ?? 0), tvl.tvl)
}

const getDummyRecord = () => ({ SK: undefined, tvl: 0 })

export default async function (
  protocol: Protocol,
  unixTimestamp: number,
  tvl: tvlsObject<number>,
  storePreviousData: boolean,
  usdTokenBalances: tvlsObject<TokensValueLocked>,
  overwriteExistingData = false,
  extraOptions: any = {},
) {
  const { debugData } = extraOptions
  const hourlyPK = hourlyTvl(protocol.id);
  const currentTvl = calculateTVLWithAllExtraSections(tvl)

  if (currentTvl < 0) {
    const errorMessage = `TVL for ${protocol.name} is negative TVL(${currentTvl}), fix the adapter.`
    await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!)
    throw new Error(errorMessage);
  }

  const [
    lastHourlyTVLObject,
    lastHourlyUsdTVLObject,
    lastDailyTVLRecord,
    lastWeeklyTVLRecord,
    dayDailyTvlRecord,
    weekDailyTvlRecord,
  ] = (await Promise.all([
    getLatestProtocolItem(hourlyTvl, protocol.id),
    getLatestProtocolItem(hourlyUsdTokensTvl, protocol.id),
    getClosestProtocolItem(hourlyTvl, protocol.id, unixTimestamp - secondsInDay, { timestampFrom: unixTimestamp - 2 * secondsInDay }),
    getClosestProtocolItem(hourlyTvl, protocol.id, unixTimestamp - secondsInWeek, { timestampFrom: unixTimestamp - 2 * secondsInWeek }),
    getClosestProtocolItem(dailyTvl, protocol.id, unixTimestamp - secondsInDay, { timestampFrom: unixTimestamp - 2 * secondsInDay }),
    getClosestProtocolItem(dailyTvl, protocol.id, unixTimestamp - secondsInWeek, { timestampFrom: unixTimestamp - 2 * secondsInWeek }),
  ])).map((i: any) => i ?? getDummyRecord())

  if (storePreviousData) {
    await Promise.all(Object.entries(tvl).map(async ([sectionName, sectionTvl]) => {
      const prevTvl = lastHourlyTVLObject[sectionName]
      if (sectionTvl === 0 && prevTvl !== 0 && prevTvl !== undefined) {
        await sendMessage(
          `TVL for ${protocol.name} has dropped to 0 on key "${sectionName}" (previous TVL was ${prevTvl})`,
          process.env.DROPS_WEBHOOK!)
      }
    }))
  }

  {
    const lastHourlyTVL = calculateTVLWithAllExtraSections(lastHourlyTVLObject);
    if (currentTvl > 200e9) {
      let errorMessage = `TVL of ${protocol.name} is over 200bn`
      Object.values(usdTokenBalances).forEach(tokenBalances => {
        for (const [token, value] of Object.entries(tokenBalances))
          if (value > 1e7) {
            errorMessage += `\n${token} has ${humanizeNumber(value)}`
          }
      })

      await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!)
      await sendMessage(`
        ${errorMessage}
        debug data: ${JSON.stringify(debugData)}
        `, process.env.OUTDATED_WEBHOOK!)
      throw new Error(errorMessage)
    }
    if (storePreviousData && lastHourlyTVL * 2 < currentTvl && lastHourlyTVL !== 0) {
      const change = `${humanizeNumber(lastHourlyTVL)} to ${humanizeNumber(
        currentTvl
      )}`;
      let tvlToCompareAgainst = lastWeeklyTVLRecord;
      if (tvlToCompareAgainst.SK === undefined) {
        tvlToCompareAgainst = lastDailyTVLRecord;
        if (tvlToCompareAgainst.SK === undefined) {
          tvlToCompareAgainst = {
            tvl: 10e9 // 10bil
          }
        }
      }
      const timeElapsed = Math.abs(lastHourlyTVLObject.SK - unixTimestamp)
      const timeLimitDisableHours = 15;
      if (
        timeElapsed < (timeLimitDisableHours * HOUR) &&
        lastHourlyTVL * 5 < currentTvl &&
        calculateTVLWithAllExtraSections(tvlToCompareAgainst) * 5 < currentTvl &&
        currentTvl > 1e6
      ) {
        const errorMessage = `TVL for ${protocol.name} has 5x (${change}) within one hour. It's been disabled but will be automatically re-enabled in ${(timeLimitDisableHours - timeElapsed / HOUR).toFixed(2)} hours`
        if (timeElapsed > (5 * HOUR)) {
          if (currentTvl > 100e6) {
            await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!)
          }
          await sendMessage(errorMessage, process.env.OUTDATED_WEBHOOK!)
        }
        await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
        throw new Error(
          errorMessage
        );
      } else {
        const errorMessage = `TVL for ${protocol.name} has >2x (${change})`
        reportError(
          errorMessage,
          protocol.name
        );
        await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
      }
    }
    if (storePreviousData && lastHourlyTVL / 2 > currentTvl && Math.abs(lastHourlyUsdTVLObject.SK - unixTimestamp) < 12 * HOUR) {
      let tvlFromMissingTokens = 0;
      let missingTokens = '';
      [...extraSections, "tvl"].forEach(section => {
        if (!lastHourlyUsdTVLObject || !lastHourlyUsdTVLObject[section]) return;
        Object.entries(lastHourlyUsdTVLObject[section]).forEach(([coin, tvl]) => {
          if (usdTokenBalances[section]?.[coin] === undefined) {
            tvlFromMissingTokens += Number(tvl)
            missingTokens += `${coin},`
          }
        })
      })
      if (tvlFromMissingTokens > lastHourlyTVL * 0.25) {
        console.log(`TVL for ${protocol.name} has dropped >50% within one hour, with >30% coming from dropped tokens (${missingTokens}). Current tvl: ${currentTvl}, previous tvl: ${lastHourlyTVL}, tvl from missing tokens: ${tvlFromMissingTokens}`)
        if (lastHourlyTVL > 1e5) {
          const errorMessage = `TVL for ${protocol.name} has dropped >50% within one hour, with >30% coming from dropped tokens (${missingTokens}). It's been disabled.`
          await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
          throw new Error(errorMessage);
        }
      }
    }
  }

  // await checkForMissingAssets(protocol, lastHourlyUsdTVLObject, usdTokenBalances)
  let tvlPrev1Day = lastDailyTVLRecord.tvl
  let tvlPrev1Week = lastWeeklyTVLRecord.tvl
  const dayDailyTvl = dayDailyTvlRecord.tvl
  const weekDailyTvl = weekDailyTvlRecord.tvl
  if (tvlPrev1Day !== 0 && dayDailyTvl !== 0 && tvlPrev1Day > (dayDailyTvl * 2)) {
    tvlPrev1Day = 0;
  }
  if (tvlPrev1Week !== 0 && weekDailyTvl !== 0 && tvlPrev1Week > (weekDailyTvl * 2)) {
    tvlPrev1Week = 0;
  }

  const hourlyData = {
    ...tvl,
    ...(storePreviousData
      ? {
        tvlPrev1Hour: lastHourlyTVLObject.tvl,
        tvlPrev1Day,
        tvlPrev1Week,
      }
      : {})
  }
  await dynamodb.put({
    PK: hourlyPK,
    SK: unixTimestamp,
    ...hourlyData,
  });

  const dayTimestamp = getTimestampAtStartOfDay(unixTimestamp);

  const closestDailyRecord = overwriteExistingData ? null : await getClosestProtocolItem(dailyTvl, protocol.id, unixTimestamp - secondsInDay, { searchWidth: secondsInDay * 1.5 })
  if (overwriteExistingData || getDay(closestDailyRecord?.SK) !== getDay(unixTimestamp)) {
    // First write of the day
    await dynamodb.put({
      PK: dailyTvl(protocol.id),
      SK: dayTimestamp,
      ...tvl,
    });

  }

  const writeOptions = { overwriteExistingData };
  await Promise.all([
    saveProtocolItem(hourlyTvl, { id: protocol.id, timestamp: unixTimestamp, data: hourlyData, }, writeOptions),
    saveProtocolItem(dailyTvl, { id: protocol.id, timestamp: dayTimestamp, data: tvl, }, writeOptions),
  ])
}


async function checkForMissingAssets(
  protocol: Protocol,
  previous: tvlsObject<TokensValueLocked>,
  current: tvlsObject<TokensValueLocked>
) {
  let errorMessage: string = `TVL flags in ${protocol.module}: \n`;
  const baseErrorLength: number = errorMessage.length
  Object.keys(previous).map((chain: string) => {
    if (['SK', 'tvl'].includes(chain)) return
    if (!(chain in current)) {
      errorMessage += `chain ${chain} missing \n`;
      return;
    }
    Object.keys(previous[chain]).map((ticker: string) => {
      if (!(ticker in current[chain]) || current[chain][ticker] == 0) errorMessage += `symbol ${ticker} missing \n`;
    });
  });

  if (errorMessage.length == baseErrorLength) return
  await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!);
  throw new Error(errorMessage);
}
