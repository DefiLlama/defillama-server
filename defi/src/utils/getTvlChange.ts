import { getPercentChange } from "../getProtocols";
import { secondsInDay, secondsInHour, secondsInWeek } from "./date";
import {getLastRecord, hourlyTvl } from "./getLastRecord"
import { nonChains } from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

type ChainTvls = {
    [key: string]: {
        tvl: number,
        'change_1d': number,
        'change_7d': number,
        'change_1m': number
    }
}

export async function getTvlChange(protocolId: string): Promise<ChainTvls | null> {
    const now = Math.round(Date.now() / 1000)
    const lastRecord = await getLastRecord(hourlyTvl(protocolId))
    const previousDayRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInDay, secondsInHour)
    const previousWeekRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek, secondsInDay)
    const previousMonthRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek * 4, secondsInDay)

    if (lastRecord && previousDayRecord && previousWeekRecord) {
        const chainTvls: ChainTvls = {}
        Object.entries(lastRecord).forEach(([chain, chainTvl]) => {
            if (chain !== 'tvl' && nonChains.includes(chain)) {
                return;
            }
            chainTvls[chain] = {
                tvl: chainTvl,
                'change_1d': 0,
                'change_7d': 0,
                'change_1m': 0,
            }
            const previousDayTvl = chain ? previousDayRecord[chain] : null
            const previousWeekTvl = chain ? previousWeekRecord[chain] : null
            const previousMonthTvl = chain ? previousMonthRecord[chain] : null
            if (previousDayTvl && previousWeekTvl) {
                chainTvls[chain]['change_1d'] = getPercentChange(previousDayTvl, chainTvl) || 0
                chainTvls[chain]['change_7d'] = getPercentChange(previousWeekTvl, chainTvl) || 0
                chainTvls[chain]['change_1m'] = getPercentChange(previousMonthTvl, chainTvl) || 0
            }
        })
        return chainTvls
    } else return null
}