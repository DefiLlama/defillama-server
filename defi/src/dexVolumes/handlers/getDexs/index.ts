import { successResponse, wrap, IResponse } from "../../../utils/shared";
import volumeAdapters, { Dex } from "../../dexAdapters";
import { getVolume, Volume, VolumeType } from "../../data/volume"
import allSettled from "promise.allsettled";
import { IRecordVolumeData } from "../storeDexVolume";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";

interface VolumeSummaryDex extends Dex {
    totalVolume24h: number | null
    volume24hBreakdown: IRecordVolumeData | null
    volumes?: Volume[]
}

export const handler = async (): Promise<IResponse> => {
    const dexsResults = await allSettled(volumeAdapters.map<Promise<VolumeSummaryDex>>(async (adapter) => {
        try {
            const volume = await getVolume(adapter.id, VolumeType.dailyVolume)
            // This check is made to infer Volume[] type instead of Volume type
            if (!(volume instanceof Array)) throw new Error("Wrong volume queried")
            return {
                ...adapter,
                totalVolume24h: summAllVolumes(volume[volume.length - 1].data),
                volume24hBreakdown: volume[volume.length - 1].data,
                volumes: volume,
                change_1d: calcnDChange(volume, 1),
                change_7d: calcnDChange(volume, 7),
                change_1m: calcnDChange(volume, 30)
            }
        } catch (error) {
            console.error(error)
            return {
                ...adapter,
                totalVolume24h: null,
                volume24hBreakdown: null,
                yesterdayTotalVolume: null,
                change_1d: null,
                change_7d: null,
                change_1m: null
            }
        }
    }))
    const rejectedDexs = dexsResults.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)
    const dexs = dexsResults.map(fd => fd.status === "fulfilled" ? fd.value : undefined).filter(d => d !== undefined) as VolumeSummaryDex[]
    const generalStats = getSumAllDexsToday(dexs)
    return successResponse({ dexs: dexs.map(removeVolumesObject), ...generalStats }, 10 * 60); // 10 mins cache
};

const summAllVolumes = (breakdownVolumes: IRecordVolumeData) =>
    Object.values(breakdownVolumes).reduce((acc, volume) =>
        acc + Object.values(volume)
            .reduce<number>((vacc, current) => typeof current === 'number' ? vacc + current : vacc, 0)
        , 0)

const calcnDChange = (volumes: Volume[], nDaysChange: number) => {
    let totalVolume = 0
    let totalVolumeNd = 0
    const todaysTimestamp = getTimestampAtStartOfDayUTC((Date.now() - 1000 * 60 * 60 * 24) / 1000);
    const timestamp1d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - nDaysChange)) / 1000
    const todaysVolume = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === todaysTimestamp)?.data
    const volumeNd = volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp1d)?.data
    totalVolume += todaysVolume ? summAllVolumes(todaysVolume) : 0
    totalVolumeNd += volumeNd ? summAllVolumes(volumeNd) : 0
    return (totalVolume - totalVolumeNd) / totalVolume * 100
}

const getSumAllDexsToday = (dexs: VolumeSummaryDex[]) => {
    const todaysTimestamp = getTimestampAtStartOfDayUTC((Date.now() - 1000 * 60 * 60 * 24) / 1000);
    const timestamp1d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - 1)) / 1000
    const timestamp7d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - 7)) / 1000
    const timestamp30d = (new Date(todaysTimestamp * 1000)).setDate((new Date(todaysTimestamp * 1000).getDate() - 30)) / 1000
    let totalVolume = 0
    let totalVolume1d = 0
    let totalVolume7d = 0
    let totalVolume30d = 0
    for (const dex of dexs) {
        const todaysVolume = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === todaysTimestamp)?.data
        const volume1d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp1d)?.data
        const volume7d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp7d)?.data
        const volume30d = dex.volumes?.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === timestamp30d)?.data
        totalVolume += todaysVolume ? summAllVolumes(todaysVolume) : 0
        totalVolume1d += volume1d ? summAllVolumes(volume1d) : 0
        totalVolume7d += volume7d ? summAllVolumes(volume7d) : 0
        totalVolume30d += volume30d ? summAllVolumes(volume30d) : 0
    }
    return {
        totalVolume,
        changeVolume1d: ((totalVolume - totalVolume1d) / totalVolume) * 100,
        changeVolume7d: ((totalVolume - totalVolume7d) / totalVolume) * 100,
        changeVolume30d: ((totalVolume - totalVolume30d) / totalVolume) * 100,
    }
}

const removeVolumesObject = (dex: VolumeSummaryDex) => {
    delete dex['volumes']
    return dex
}

export default wrap(handler);