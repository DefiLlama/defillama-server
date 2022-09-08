import { successResponse, wrap, IResponse } from "../../../utils/shared";
import volumeAdapters, { Dex } from "../../dexAdapters";
import { getVolume, Volume, VolumeType } from "../../data/volume"
import allSettled from "promise.allsettled";
import { IRecordVolumeData } from "../storeDexVolume";
import { calcNdChange, generateAggregatedVolumesChartData, getSumAllDexsToday, getSummaryByProtocolVersion, IChartData, IGeneralStats, sumAllVolumes } from "../../utils/volumeCalcs";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import getAllChainsFromDexAdapters, { formatChain, getChainByProtocolVersion } from "../../utils/getChainsFromDexAdapters";
import config from "../../dexAdapters/config";

export interface IGetDexsResponseBody extends IGeneralStats {
    totalDataChart?: IChartData,
    dexs: Omit<VolumeSummaryDex, 'volumes'>[]
}

export interface VolumeSummaryDex extends Dex {
    totalVolume24h: number | null
    volume24hBreakdown: IRecordVolumeData | null
    volumes?: Volume[]
    change_1d: number | null
    change_7d: number | null
    change_1m: number | null
    protocolVersions: {
        [protVersion: string]: {
            totalVolume24h: number | null
            change_1d: number | null
            change_7d: number | null
            change_1m: number | null
            chains: string[] | null
        } | null
    } | null
}

export const handler = async (): Promise<IResponse> => {
    const prevDayTimestamp = getTimestampAtStartOfDayUTC((Date.now() - 1000 * 60 * 60 * 24) / 1000)
    const dexsResults = await allSettled(volumeAdapters.filter(va => va.config?.enabled).map<Promise<VolumeSummaryDex>>(async (adapter) => {
        try {
            const volumes = await getVolume(adapter.id, VolumeType.dailyVolume)
            // This check is made to infer Volume[] type instead of Volume type
            if (!(volumes instanceof Array)) throw new Error("Wrong volume queried")
            const prevDayVolume = volumes.find(vol => vol.timestamp === prevDayTimestamp)
            const chainsSummary = getChainByProtocolVersion(adapter.volumeAdapter)
            const protocolVersionsSummary = getSummaryByProtocolVersion(volumes, prevDayTimestamp)
            return {
                ...adapter,
                totalVolume24h: prevDayVolume ? sumAllVolumes(prevDayVolume.data) : 0,
                volume24hBreakdown: prevDayVolume ? prevDayVolume.data : null,
                volumes: volumes,
                change_1d: calcNdChange(volumes, 1),
                change_7d: calcNdChange(volumes, 7),
                change_1m: calcNdChange(volumes, 30),
                chains: getAllChainsFromDexAdapters([adapter.volumeAdapter]).map(formatChain),
                protocolVersions: protocolVersionsSummary ? Object.entries(protocolVersionsSummary).reduce((acc, [protName, summary]) => {
                    acc[protName] = {
                        ...summary,
                        chains: chainsSummary ? chainsSummary[protName] : null
                    }
                    return acc
                }, {} as NonNullable<VolumeSummaryDex['protocolVersions']>) : null
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
                change_1m: null,
                protocolVersions: null
            }
        }
    }))
    const rejectedDexs = dexsResults.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)
    const dexs = dexsResults.map(fd => fd.status === "fulfilled" ? fd.value : undefined).filter(d => d !== undefined) as VolumeSummaryDex[]
    const generalStats = getSumAllDexsToday(dexs.map(substractSubsetVolumes))
    return successResponse({
        totalDataChart: generateAggregatedVolumesChartData(dexs),
        ...generalStats,
        dexs: dexs.map(removeVolumesObject),
    } as IGetDexsResponseBody, 10 * 60); // 10 mins cache
};

const substractSubsetVolumes = (dex: VolumeSummaryDex, _index: number, dexs: VolumeSummaryDex[]): VolumeSummaryDex => {
    const includedVolume = config[dex.volumeAdapter].includedVolume
    if (includedVolume && includedVolume.length > 0) {
        const includedSummaries = dexs.filter(dex => includedVolume.includes(dex.volumeAdapter))
        let computedSummary: VolumeSummaryDex = dex
        for (const includedSummary of includedSummaries) {
            const newSum = getSumAllDexsToday([computedSummary], includedSummary)
            computedSummary = {
                ...includedSummary,
                totalVolume24h: newSum['totalVolume'],
                change_1d: newSum['changeVolume1d'],
                change_7d: newSum['changeVolume7d'],
                change_1m: newSum['changeVolume30d'],
            }
        }
        return computedSummary
    }
    else
        return dex
}

const removeVolumesObject = (dex: VolumeSummaryDex) => {
    delete dex['volumes']
    return dex
}

export default wrap(handler);