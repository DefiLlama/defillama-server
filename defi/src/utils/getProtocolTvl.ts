import { secondsInDay, secondsInHour, secondsInWeek } from "./date";
import {getLastRecord, hourlyTvl } from "./getLastRecord"
import { getChainDisplayName, nonChains } from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

type ChainTvls = {
    [key: string]: {
        'tvl': number | null,
        'tvlPrevDay': number | null,
        'tvlPrevWeek': number | null,
        'tvlPrevMonth': number | null
    }
}

export type ProtocolTvls = {
    tvl: number | null,
    tvlPrevDay: number | null,
    tvlPrevWeek: number | null,
    tvlPrevMonth: number | null,
    chainTvls: ChainTvls
}

export async function getProtocolTvl(protocolId: string, useNewChainNames: boolean): Promise<ProtocolTvls> {
    const now = Math.round(Date.now() / 1000)
    const lastRecord = await getLastRecord(hourlyTvl(protocolId))
    const previousDayRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInDay, secondsInHour)
    const previousWeekRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek, secondsInDay)
    const previousMonthRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek * 4, secondsInDay)
    const chainTvls: ChainTvls = {}
    let tvl: number | null = null;
    let tvlPrevDay: number | null = null;
    let tvlPrevWeek: number | null = null;
    let tvlPrevMonth: number | null = null;
    if (lastRecord && previousDayRecord?.SK && previousWeekRecord?.SK && previousMonthRecord?.SK) {
        Object.entries(lastRecord).forEach(([chain, chainTvl]) => {
            if (chain !== 'tvl' && nonChains.includes(chain)) {
                return;
            }

            const previousDayTvl = chain ? previousDayRecord[chain] : null
            const previousWeekTvl = chain ? previousWeekRecord[chain] : null
            const previousMonthTvl = chain ? previousMonthRecord[chain] : null

            if (previousDayTvl && previousWeekTvl && previousMonthTvl) {
                if (chain === 'tvl') {
                    tvl = chainTvl
                    tvlPrevDay = previousDayTvl
                    tvlPrevWeek = previousWeekTvl
                    tvlPrevMonth = previousMonthTvl
                } else {
                    const chainDisplayName = getChainDisplayName(chain, useNewChainNames)
                    chainTvls[chainDisplayName] = {
                    'tvl': chainTvl,
                    'tvlPrevDay': previousDayTvl,
                    'tvlPrevWeek': previousWeekTvl,
                    'tvlPrevMonth': previousMonthTvl,
                };
                }
            }
        })
    }
    return {tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, chainTvls}
}