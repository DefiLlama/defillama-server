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

export async function getTvlChange(protocolId: string): Promise<ChainTvls> {
    const now = Math.round(Date.now() / 1000)
    const lastRecord = await getLastRecord(hourlyTvl(protocolId))
    const previousDayRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInDay, secondsInHour)
    const previousWeekRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek, secondsInDay)
    const previousMonthRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek * 4, secondsInDay)
    if (lastRecord && previousDayRecord?.SK && previousWeekRecord?.SK && previousMonthRecord?.SK) {
        const defaultTvl = lastRecord.tvl || 0
        const oneDayDefaultTvl = previousDayRecord.tvl || 0
        const oneWeekDefaultTvl = previousWeekRecord.tvl || 0
        const oneMonthDefaultTvl = previousMonthRecord.tvl || 0
        const chainTvls: ChainTvls = {}
        Object.entries(lastRecord).forEach(([chain, chainTvl]) => {
            if (chain !== 'tvl' && nonChains.includes(chain)) {
                return;
            }
            chainTvls[chain] = {
                'change_1d': null,
                'change_7d': null,
                'change_1m': null,
            }
            const previousDayTvl = chain ? previousDayRecord[chain] : null
            const previousWeekTvl = chain ? previousWeekRecord[chain] : null
            const previousMonthTvl = chain ? previousMonthRecord[chain] : null
            if (previousDayTvl && previousWeekTvl) {
                chainTvls[chain]['change_1d'] = getPercentChange(oneDayDefaultTvl + previousDayTvl, defaultTvl + chainTvl)
                chainTvls[chain]['change_7d'] = getPercentChange(oneWeekDefaultTvl + previousWeekTvl, defaultTvl + chainTvl)
                chainTvls[chain]['change_1m'] = getPercentChange(oneMonthDefaultTvl + previousMonthTvl, defaultTvl + chainTvl)
            }
        })
        return chainTvls
    } else return {}
}