import { successResponse, wrap, IResponse } from "../../../utils/shared";
import volumeAdapters, { Dex } from "../../dexAdapters";
import { getVolume, Volume, VolumeType } from "../../data/volume"
import allSettled from "promise.allsettled";
import { IRecordVolumeData } from "../storeDexVolume";
import { calcNdChange, generateAggregatedVolumesChartData, getSumAllDexsToday, sumAllVolumes } from "../../utils/volumeCalcs";

export interface VolumeSummaryDex extends Dex {
    totalVolume24h: number | null
    volume24hBreakdown: IRecordVolumeData | null
    volumes?: Volume[]
}

export const handler = async (): Promise<IResponse> => {
    const dexsResults = await allSettled(volumeAdapters.filter(va => va.config?.enabled).map<Promise<VolumeSummaryDex>>(async (adapter) => {
        try {
            const volumes = await getVolume(adapter.id, VolumeType.dailyVolume)
            // This check is made to infer Volume[] type instead of Volume type
            if (!(volumes instanceof Array)) throw new Error("Wrong volume queried")
            return {
                ...adapter,
                totalVolume24h: sumAllVolumes(volumes[volumes.length - 1].data),
                volume24hBreakdown: volumes[volumes.length - 1].data,
                volumes: volumes,
                change_1d: calcNdChange(volumes, 1),
                change_7d: calcNdChange(volumes, 7),
                change_1m: calcNdChange(volumes, 30)
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
    return successResponse({
        totalDataChart: generateAggregatedVolumesChartData(dexs),
        ...generalStats,
        dexs: dexs.map(removeVolumesObject),
    }, 10 * 60); // 10 mins cache
};

const removeVolumesObject = (dex: VolumeSummaryDex) => {
    delete dex['volumes']
    return dex
}

export default wrap(handler);