// exactly same as storeNewTvl.ts but reads data from postgres instead of dynamodb

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
import { excludedTvlId } from "../../l2/constants";


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
    if (!(tvl?.bitcoin < 0))   // TODO: there is some bitcoin bug that cause negative tvl sometimes, this needs to be fixed, but it is known issue so not spamming the team webhook for now
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
    if (currentTvl > 300e9 && excludedTvlId != protocol.id) {
      let errorMessage = `TVL of ${protocol.name} is over 300bn`
      Object.values(usdTokenBalances).forEach(tokenBalances => {
        for (const [token, value] of Object.entries(tokenBalances))
          if (value > 1e7) {
            errorMessage += `\n${token} has ${humanizeNumber(value)}`
          }
      })
      console.log(errorMessage, usdTokenBalances, currentTvl, tvl, debugData)


      if (currentTvl < 2e12) // less than 2 trillion
        await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!)
      throw new Error(errorMessage)
    }
    if (storePreviousData && lastHourlyTVL * 2 < currentTvl && lastHourlyTVL !== 0
      && !process.env.UI_TOOL_MODE // skip check if it run from the UI tool
    ) {
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
          if (currentTvl > 10e6) {
            await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!)
          }
          await sendMessage(errorMessage, process.env.OUTDATED_WEBHOOK!)
        }
        await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
        throw new Error(
          errorMessage
        );
      } else {
        const errorMessage = `TVL of ${protocol.name} has >2x (${change})`
        if (currentTvl > 10e6) {
          await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!)
        }
        reportError(
          errorMessage,
          protocol.name
        );
        await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
      }
    }
    if (storePreviousData && lastHourlyTVL / 2 > currentTvl && Math.abs(lastHourlyUsdTVLObject.SK - unixTimestamp) < 12 * HOUR) {
      let tvlFromMissingTokens = 0;
      let missingTokens: { coin: string, value: number, valueHN: string }[] = [];
      let highValueDrop: { coin: string, value: number, valueHN: string }[] = [];
      [...extraSections, "tvl"].forEach(section => {
        if (!lastHourlyUsdTVLObject || !lastHourlyUsdTVLObject[section]) return;
        Object.entries(lastHourlyUsdTVLObject[section]).forEach(([coin, tvl]) => {
          const currentTokenUSDTvl = usdTokenBalances[section]?.[coin]
          if (currentTokenUSDTvl === undefined) {
            tvlFromMissingTokens += Number(tvl)
            missingTokens.push({ coin, valueHN: humanizeNumber(tvl as any), value: tvl as number })
          }

          if (tvl as number > 10e6 && typeof +currentTokenUSDTvl === 'number' && (tvl as number) / 4 > +currentTokenUSDTvl) {
            const diff = (tvl as number) - (+currentTokenUSDTvl || 0)
            highValueDrop.push({ coin, valueHN: humanizeNumber(diff as any), value: diff as number })
          }
        })
      })

      missingTokens = missingTokens.sort((a, b) => b.value - a.value)
      let missingTokenString = missingTokens.map(token => `${token.coin}: ${token.valueHN}`).join(", ")
      missingTokenString = missingTokenString.length ? `missing tokens: ${missingTokenString}` : ""
      highValueDrop = highValueDrop.sort((a, b) => b.value - a.value)
      const highValueDropString = highValueDrop.map(token => `${token.coin}: ${token.valueHN}`).join(", ")
      if (highValueDrop.length)
        missingTokenString += ` high drop: ${highValueDropString}`
      const lastHourlyTVLHN = humanizeNumber(lastHourlyTVL)
      const currentTvlHN = humanizeNumber(currentTvl)

      // if tvl was more than 50M send an high severity alert
      if (lastHourlyTVL > 50e6) {
        const ignoredTvl = new Set(['Olympus DAO'])
        if (!ignoredTvl.has(protocol.name))
          await sendMessage(`TVL of ${protocol.name} has dropped from ${lastHourlyTVLHN} to ${currentTvlHN}. ${missingTokenString}`, process.env.TEAM_WEBHOOK!)
      }

      console.log(`TVL for ${protocol.name} has dropped >50% within one hour. Current tvl: ${currentTvlHN}, previous tvl: ${lastHourlyTVLHN} . ${missingTokenString}`)

      if (!process.env.UI_TOOL_MODE && lastHourlyTVL > 1e5) {
        const errorMessage = `TVL for ${protocol.name} has dropped >50% within one hour. It's been disabled. Current tvl: ${currentTvlHN}, previous tvl: ${lastHourlyTVLHN}. ${missingTokenString}`
        console.log(errorMessage, 'skipping db update')
        await sendMessage(errorMessage, process.env.SPIKE_WEBHOOK!)
        throw new Error(errorMessage);
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
  await dynamodb.putEventData({
    PK: hourlyPK,
    SK: unixTimestamp,
    ...hourlyData,
    source: 'tvl-adapter',
  })

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
