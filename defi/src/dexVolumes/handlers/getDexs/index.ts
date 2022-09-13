import { successResponse, wrap, IResponse } from "../../../utils/shared";
import volumeAdapters, { Dex } from "../../dexAdapters";
import { getVolume, Volume, VolumeType } from "../../data/volume"
import allSettled from "promise.allsettled";
import { IRecordVolumeData } from "../storeDexVolume";
import { calcNdChange, generateAggregatedVolumesChartData, getSumAllDexsToday, getSummaryByProtocolVersion, IChartData, IGeneralStats, sumAllVolumes } from "../../utils/volumeCalcs";
import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../../utils/date";
import getAllChainsFromDexAdapters, { formatChain, getChainByProtocolVersion } from "../../utils/getChainsFromDexAdapters";
import config from "../../dexAdapters/config";
import { ONE_DAY_IN_SECONDS } from "../getDexVolume";
import { sendDiscordAlert } from "../../utils/notify";

export interface IGetDexsResponseBody extends IGeneralStats {
    totalDataChart?: IChartData,
    dexs: Omit<VolumeSummaryDex, 'volumes'>[]
}

export interface VolumeSummaryDex extends Pick<Dex, 'name'> {
    totalVolume24h: number | null
    volume24hBreakdown: IRecordVolumeData | null
    volumeAdapter?: Dex['volumeAdapter']
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
    const dexsResults = await allSettled(volumeAdapters.filter(va => va.config?.enabled).map<Promise<VolumeSummaryDex>>(async (adapter) => {
        try {
            const volumes = await getVolume(adapter.id, VolumeType.dailyVolume)
            // This check is made to infer Volume[] type instead of Volume type
            if (!(volumes instanceof Array)) throw new Error("Wrong volume queried")

            // Return last available data. Ideally last day volume, if not, prevents 0 volume values until data is updated or fixed
            let prevDayTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
            const prevDayVolume = volumes[volumes.length - 1] //volumes.find(vol => vol.timestamp === prevDayTimestamp)
            if (prevDayTimestamp !== prevDayVolume.timestamp) {
                // await sendDiscordAlert(`Volume not updated\nAdapter: ${adapter.name}\n${formatTimestampAsDate(prevDayTimestamp.toString())} <- Report date\n${formatTimestampAsDate(prevDayVolume.timestamp.toString())} <- Last data found`)
                console.error("Volume not updated", adapter.name, prevDayTimestamp, prevDayVolume.timestamp)
            }

            if (prevDayTimestamp - prevDayVolume.timestamp >= ONE_DAY_IN_SECONDS * 2) {
                // await sendDiscordAlert(`${adapter.name} has 2 days old data... Not including in the response`)
                throw new Error(`${adapter.name} has ${(1662940800 - 1662681600) / (60 * 60 * 24)} days old data... Not including in the response`)
            }

            prevDayTimestamp = prevDayVolume.timestamp


            const change_1d = calcNdChange(volumes, 1, prevDayTimestamp)
            if (!change_1d || change_1d && (change_1d < -95 || change_1d > 10000)) {
                // await sendDiscordAlert(`${adapter.name} has a daily change of ${change_1d}, looks sus... Not including in the response`)
                throw new Error(`${adapter.name} has a daily change of ${change_1d}, looks sus... Not including in the response`)
            }

            const chainsSummary = getChainByProtocolVersion(adapter.volumeAdapter)
            const protocolVersionsSummary = getSummaryByProtocolVersion(volumes, prevDayTimestamp)
            return {
                name: adapter.name,
                volumeAdapter: adapter.volumeAdapter,
                totalVolume24h: prevDayVolume ? sumAllVolumes(prevDayVolume.data) : 0,
                volume24hBreakdown: prevDayVolume ? prevDayVolume.data : null,
                volumes: volumes.map(removeEventTimestampAttribute),
                change_1d: change_1d,
                change_7d: calcNdChange(volumes, 7, prevDayTimestamp),
                change_1m: calcNdChange(volumes, 30, prevDayTimestamp),
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
                name: adapter.name,
                volumeAdapter: adapter.volumeAdapter,
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
    const dexs = dexsResults.map(fd => fd.status === "fulfilled" && fd.value.totalVolume24h ? fd.value : undefined).filter(d => d !== undefined) as VolumeSummaryDex[]
    const generalStats = getSumAllDexsToday(dexs.map(substractSubsetVolumes))
    return successResponse({
        totalDataChart: generateAggregatedVolumesChartData(dexs),
        ...generalStats,
        dexs: dexs.map(removeVolumesObject),
    } as IGetDexsResponseBody, 10 * 60); // 10 mins cache
};

const substractSubsetVolumes = (dex: VolumeSummaryDex, _index: number, dexs: VolumeSummaryDex[]): VolumeSummaryDex => {
    const volumeAdapter = dex.volumeAdapter
    if (!volumeAdapter) throw Error("No volumeAdapter found")
    const includedVolume = config[volumeAdapter].includedVolume
    if (includedVolume && includedVolume.length > 0) {
        const includedSummaries = dexs.filter(dex => {
            const volumeAdapter = dex.volumeAdapter
            if (!volumeAdapter) throw Error("No volumeAdapter found")
            includedVolume.includes(volumeAdapter)
        })
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

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const removeVolumesObject = (dex: WithOptional<VolumeSummaryDex, 'volumeAdapter'>) => {
    delete dex['volumes']
    delete dex['volumeAdapter']
    return dex
}

const removeEventTimestampAttribute = (v: Volume) => {
    delete v.data['eventTimestamp']
    return v
}

export default wrap(handler);