import { getPercentChange } from "../getProtocols";
import { secondsInDay, secondsInWeek } from "./date";
import { dailyTvl } from "./getLastRecord"
import { nonChains } from "./normalizeChain";
import getTVLOfRecordClosestToTimestamp from "./shared/getRecordClosestToTimestamp";

type ChainTvlsChange = {
    [key: string]: {
        'change_1d': number | null,
        'change_7d': number | null
    }
}

export async function getTvlChange(protocolId: string): Promise<ChainTvlsChange | null> {
    const now = Math.round(Date.now() / 1000)
    const lastRecord = await getTVLOfRecordClosestToTimestamp(dailyTvl(protocolId), now, secondsInDay)
    const previousDayrecord = await getTVLOfRecordClosestToTimestamp(dailyTvl(protocolId), now - secondsInDay, secondsInDay)
    const previousWeekRecord = await getTVLOfRecordClosestToTimestamp(dailyTvl(protocolId), now - secondsInWeek, secondsInWeek)

    if (lastRecord || previousDayrecord || previousWeekRecord) {
        const tvlChange: ChainTvlsChange = {}
        Object.entries(lastRecord).forEach(([chain, chainTvl]) => {
            if (chain !== 'tvl' && nonChains.includes(chain)) {
                return;
            }
            tvlChange[chain] = {
                'change_1d': 0,
                'change_7d': 0
            }
            const previousDayTvl = chain ? previousDayrecord[chain] : null
            const previousWeekTvl = chain ? previousWeekRecord[chain] : null
            if (previousDayTvl && previousWeekTvl) {
                tvlChange[chain]['change_1d'] = getPercentChange(previousDayTvl, chainTvl)
                tvlChange[chain]['change_7d'] = getPercentChange(previousWeekTvl, chainTvl)
            }
        })
        return tvlChange
    } else return null
}