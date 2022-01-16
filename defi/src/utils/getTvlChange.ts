import { getPercentChange } from "../getProtocols";
import { secondsInDay, secondsInHour, secondsInWeek } from "./date";
import {getLastRecord, hourlyTvl } from "./getLastRecord"
import { nonChains } from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

type ChainTvls = {
    [key: string]: {
        'change_1d': number | null,
        'change_7d': number | null,
        'change_1m': number | null
    }
}

export type ProtocolTvlsChange = {
    change_1d: number | null,
    change_7d: number | null,
    change_1m: number | null,
    chainTvlsChange: ChainTvls
}

export async function getTvlChange(protocolId: string): Promise<ProtocolTvlsChange> {
    const now = Math.round(Date.now() / 1000)
    const lastRecord = await getLastRecord(hourlyTvl(protocolId))
    const previousDayRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInDay, secondsInHour)
    const previousWeekRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek, secondsInDay)
    const previousMonthRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek * 4, secondsInDay)
    const chainTvlsChange: ChainTvls = {}
    let change_1d: number | null = null;
    let change_7d: number | null = null;
    let change_1m: number | null = null;
    if (lastRecord && previousDayRecord?.SK && previousWeekRecord?.SK && previousMonthRecord?.SK) {
        const defaultTvl = lastRecord.tvl || 0
        const oneDayDefaultTvl = previousDayRecord.tvl || 0
        const oneWeekDefaultTvl = previousWeekRecord.tvl || 0
        const oneMonthDefaultTvl = previousMonthRecord.tvl || 0
        Object.entries(lastRecord).forEach(([chain, chainTvl]) => {
            if (chain !== 'tvl' && nonChains.includes(chain)) {
                return;
            }

            const previousDayTvl = chain ? previousDayRecord[chain] : null
            const previousWeekTvl = chain ? previousWeekRecord[chain] : null
            const previousMonthTvl = chain ? previousMonthRecord[chain] : null

            if (previousDayTvl && previousWeekTvl && previousMonthTvl) {
                if (chain === 'tvl') {
                    const previousMonthTvl = chain ? previousMonthRecord[chain] : null
                    change_1d = getPercentChange(previousDayTvl, chainTvl)
                    change_7d = getPercentChange(previousWeekTvl, chainTvl)
                    change_1m = getPercentChange(previousMonthTvl, chainTvl)
                } else {
                    chainTvlsChange[chain] = {
                        'change_1d': null,
                        'change_7d': null,
                        'change_1m': null,
                    }
                    chainTvlsChange[chain]['change_1d'] = getPercentChange(oneDayDefaultTvl + previousDayTvl, defaultTvl + chainTvl)
                    chainTvlsChange[chain]['change_7d'] = getPercentChange(oneWeekDefaultTvl + previousWeekTvl, defaultTvl + chainTvl)
                    chainTvlsChange[chain]['change_1m'] = getPercentChange(oneMonthDefaultTvl + previousMonthTvl, defaultTvl + chainTvl)
                }
            }
        })
    }
    return {change_1d, change_7d, change_1m, chainTvlsChange}
}