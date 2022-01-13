import { getPercentChange } from "../getProtocols";
import { secondsInDay, secondsInHour, secondsInWeek } from "./date";
import {getLastRecord, hourlyTvl } from "./getLastRecord"
import { nonChains } from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

type ChainTvlsChange = {
    [key: string]: {
        'change_1d': number | null,
        'change_7d': number | null,
        'change_1m': number | null
    }
}

export async function getTvlChange(protocolId: string): Promise<ChainTvlsChange | null> {
    const now = Math.round(Date.now() / 1000)
    const lastRecord = await getLastRecord(hourlyTvl(protocolId))
    const previousDayRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInDay, secondsInHour)
    const previousWeekRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek, secondsInDay)
    const previousMonthRecord = await getTVLOfRecordClosestToTimestamp(hourlyTvl(protocolId), now - secondsInWeek * 4, secondsInDay)

    if (lastRecord && previousDayRecord && previousWeekRecord) {
        const tvlChange: ChainTvlsChange = {}
        Object.entries(lastRecord).forEach(([chain, chainTvl]) => {
            if (nonChains.includes(chain)) {
                return;
            }
            tvlChange[chain] = {
                'change_1d': 0,
                'change_7d': 0,
                'change_1m': 0,
            }
            const previousDayTvl = chain ? previousDayRecord[chain] : null
            const previousWeekTvl = chain ? previousWeekRecord[chain] : null
            const previousMonthTvl = chain ? previousMonthRecord[chain] : null
            if (previousDayTvl && previousWeekTvl) {
                tvlChange[chain]['change_1d'] = getPercentChange(previousDayTvl, chainTvl)
                tvlChange[chain]['change_7d'] = getPercentChange(previousWeekTvl, chainTvl)
                tvlChange[chain]['change_1m'] = getPercentChange(previousMonthTvl, chainTvl)
            }
        })
        return tvlChange
    } else return null
}