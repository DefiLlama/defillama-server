import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { getAdaptorRecord, AdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record"
import allSettled from "promise.allsettled";

import { calcNdChange, generateAggregatedVolumesChartData, generateByDexVolumesChartData, getSumAllDexsToday, getSummaryByProtocolVersion, IChartData, IChartDataByDex, IGeneralStats, sumAllVolumes } from "../../utils/volumeCalcs";
import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../../utils/date";
import getAllChainsFromAdaptors, { formatChain, getChainByProtocolVersion, isDisabled, isDisabledByProtocolVersion } from "../../utils/getAllChainsFromAdaptors";
import config from "../../data/volumes/config";
import { ONE_DAY_IN_SECONDS } from "../getDexVolume";
import { sendDiscordAlert } from "../../utils/notify";
import { Adapter, AdapterType } from "@defillama/adaptors/adapters/types";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import { IJSON, ProtocolAdaptor } from "../../data/types";
import loadAdaptorsData from "../../data"

export interface IGetDexsResponseBody extends IGeneralStats {
    totalDataChart: IChartData,
    totalDataChartBreakdown: IChartDataByDex,
    dexs: Omit<ProtocolAdaptorSummary, 'volumes'>[]
    allChains: string[]
}

export interface ProtocolAdaptorSummary extends Pick<ProtocolAdaptor, 'name' | 'module' | 'disabled' | 'displayName'> {
    totalVolume24h: number | null
    volume24hBreakdown: IRecordAdaptorRecordData | null
    volumes?: AdaptorRecord[]
    change_1d: number | null
    change_7d: number | null
    change_1m: number | null
    chains: string[] | null
    protocolVersions: {
        [protVersion: string]: {
            totalVolume24h: number | null
            change_1d: number | null
            change_7d: number | null
            change_1m: number | null
            chains: string[] | null
            disabled: boolean
        } | null
    } | null
}

const MAX_OUTDATED_DAYS = 30

const DEFAULT_CHART_BY_ADAPTOR_TYPE: IJSON<string> = {
    [AdapterType.VOLUME]: AdaptorRecordType.dailyVolumeRecord,
    [AdapterType.FEES]: AdaptorRecordType.dailyFeesRecord
}

export const handler = async (event: AWSLambda.APIGatewayEvent, enableAlerts: boolean = false): Promise<IResponse> => {
    const pathChain = event.pathParameters?.chain?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase()
    const excludeTotalDataChart = event.queryStringParameters?.excludeTotalDataChart?.toLowerCase() === 'true'
    const excludeTotalDataChartBreakdown = event.queryStringParameters?.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
    const chainFilter = pathChain ? decodeURI(pathChain) : pathChain

    if (!adaptorType) throw new Error("Missing parameter")
    // Import data list
    const adaptorsData = (await loadAdaptorsData(adaptorType as AdapterType))
    const { importModule } = adaptorsData

    let prevDayTime = 0
    const results = await allSettled(adaptorsData.default.filter(va => va.config?.enabled).map<Promise<ProtocolAdaptorSummary>>(async (adapter) => {
        try {
            const moduleAdapter: Adapter = importModule(adapter.module).default
            const chainsSummary = getChainByProtocolVersion(moduleAdapter, chainFilter)
            let adaptorRecords = (await getAdaptorRecord(adapter.id, DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType] as AdaptorRecordType))

            // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
            if (!(adaptorRecords instanceof Array)) throw new Error("Wrong volume queried")

            // Process only volumes with a specific chain
            adaptorRecords = adaptorRecords.map(v => v.getCleanAdaptorRecord(chainFilter)).filter(v => v !== null) as AdaptorRecord[]

            if (adaptorRecords.length === 0) throw new Error(`${adapter.name} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)

            /**
             * Inject data
             */

            const firstDataTimestamp = adaptorRecords[0].timestamp
            adaptorRecords.reduce((acc, adaptorRecord) => {
                const cleanRecord = adaptorRecord.getCleanAdaptorRecord(chainFilter)
                if (cleanRecord === null) return acc
                acc.lastDataRecord = cleanRecord

                return acc
            }, {} as {
                lastDataRecord: AdaptorRecord
                nextDataRecord: AdaptorRecord
                adaptorRecords: AdaptorRecord[]
            })

            // End inject data

            /*             // Return last available data. Ideally last day data, if not, prevents 0 volume values until data is updated or fixed
                        let prevDayTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
                        let prevDayVolume = adaptorRecords[adaptorRecords.length - 1] //volumes.find(vol => vol.timestamp === prevDayTimestamp)
                        if (prevDayTimestamp !== prevDayVolume.timestamp && !adapter.disabled) {
                            if (enableAlerts)
                                await sendDiscordAlert(`Volume not updated (using old data...)\nAdapter: ${adapter.name}\n${formatTimestampAsDate(prevDayTimestamp.toString())} <- Report date\n${formatTimestampAsDate(prevDayVolume.timestamp.toString())} <- Last data found`)
                            // console.error("Volume not updated", adapter.name, prevDayTimestamp, prevDayVolume.timestamp, prevDayVolume)
                        }
            
                        if ((prevDayTimestamp - prevDayVolume.timestamp >= ONE_DAY_IN_SECONDS * MAX_OUTDATED_DAYS) && !adapter.disabled) {
                            if (enableAlerts)
                                await sendDiscordAlert(`${adapter.name} has ${MAX_OUTDATED_DAYS} days old data... Not including in the response`)
                            throw new Error(`${adapter.name} has ${(Math.abs(prevDayVolume.timestamp - prevDayTimestamp)) / (60 * 60 * 24)} days old data... Not including in the response\n${JSON.stringify(prevDayVolume)}`)
                        }
            
                        if (!adapter.disabled)
                            prevDayTimestamp = prevDayVolume.timestamp
            
                        if (prevDayTime < prevDayTimestamp) prevDayTime = prevDayTimestamp */

            const change_1d = calcNdChange(adaptorRecords, 1, prevDayTimestamp)
            if (adaptorRecords.length !== 1 && (!change_1d || change_1d && (change_1d < -99 || change_1d > 10000)) && change_1d !== null) {
                if (enableAlerts)
                    await sendDiscordAlert(`${adapter.name} has a daily change of ${change_1d}, looks sus... Not including in the response`)
                throw new Error(`${adapter.name} has a daily change of ${change_1d}, looks sus... Not including in the response\n${JSON.stringify(prevDayVolume)}`)
            }

            const protocolVersionsSummary = getSummaryByProtocolVersion(adaptorRecords, prevDayTimestamp)
            return {
                name: adapter.name,
                disabled: adapter.disabled,
                displayName: adapter.displayName,
                module: adapter.module,
                totalVolume24h: !adapter.disabled && prevDayVolume ? sumAllVolumes(prevDayVolume.data) : 0,
                volume24hBreakdown: !adapter.disabled && prevDayVolume ? prevDayVolume.data : null,
                volumes: adaptorRecords.map(removeEventTimestampAttribute),
                change_1d: change_1d,
                change_7d: calcNdChange(adaptorRecords, 7, prevDayTimestamp),
                change_1m: calcNdChange(adaptorRecords, 30, prevDayTimestamp),
                chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
                protocolVersions: protocolVersionsSummary ? Object.entries(protocolVersionsSummary).reduce((acc, [protName, summary]) => {
                    acc[protName] = {
                        ...summary,
                        chains: chainsSummary ? chainsSummary[protName] : null,
                        disabled: isDisabledByProtocolVersion(moduleAdapter, chainFilter, protName) // can be improved to avoid calling this function for each version
                    }
                    return acc
                }, {} as NonNullable<ProtocolAdaptorSummary['protocolVersions']>) : null
            }
        } catch (error) {
            // console.error("ADAPTER", adapter.name, error)
            return {
                name: adapter.name,
                module: adapter.module,
                disabled: adapter.disabled,
                displayName: adapter.displayName,
                totalVolume24h: null,
                volume24hBreakdown: null,
                yesterdayTotalVolume: null,
                change_1d: null,
                change_7d: null,
                change_1m: null,
                chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
                protocolVersions: null
            }
        }
    }))

    const rejectedDexs = results.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)
    const dexs = results.map(fd => fd.status === "fulfilled" && fd.value.disabled !== null ? fd.value : undefined).filter(d => d !== undefined) as ProtocolAdaptorSummary[]
    const generalStats = getSumAllDexsToday(dexs.map(substractSubsetVolumes), undefined, prevDayTime)

    let dexsResponse: IGetDexsResponseBody['dexs']
    let totalDataChartResponse: IGetDexsResponseBody['totalDataChart']
    let totalDataChartBreakdownResponse: IGetDexsResponseBody['totalDataChartBreakdown']

    if (chainFilter === 'chains') {
        dexsResponse = [] //should be chainsResponse
        totalDataChartResponse = [] //generateByChainsChart(dexs)
        totalDataChartBreakdownResponse = [] //nothing 4 now
    } else if (chainFilter) {
        totalDataChartResponse = excludeTotalDataChart ? [] : generateAggregatedVolumesChartData(dexs)
        totalDataChartBreakdownResponse = excludeTotalDataChartBreakdown ? [] : generateByDexVolumesChartData(dexs)
        dexsResponse = dexs.map(removeVolumesObject)
    } else {
        totalDataChartResponse = excludeTotalDataChart ? [] : generateAggregatedVolumesChartData(dexs)
        totalDataChartBreakdownResponse = excludeTotalDataChartBreakdown ? [] : generateByDexVolumesChartData(dexs)
        dexsResponse = dexs.map(removeVolumesObject)
    }

    totalDataChartResponse = totalDataChartResponse.slice(totalDataChartResponse.findIndex(it => it[1] !== 0))
    const sumBreakdownItem = (item: { [chain: string]: number }) => Object.values(item).reduce((acc, current) => acc += current, 0)
    totalDataChartBreakdownResponse = totalDataChartBreakdownResponse.slice(totalDataChartBreakdownResponse.findIndex(it => sumBreakdownItem(it[1]) !== 0))

    return successResponse({
        totalDataChart: totalDataChartResponse,
        totalDataChartBreakdown: totalDataChartBreakdownResponse,
        ...generalStats,
        dexs: dexsResponse,
        allChains: getAllChainsUniqueString(adaptorsData.default.map((adapter => adapter.module)))
    } as IGetDexsResponseBody, 10 * 60); // 10 mins cache
};

const substractSubsetVolumes = (dex: ProtocolAdaptorSummary, _index: number, dexs: ProtocolAdaptorSummary[], baseTimestamp?: number): ProtocolAdaptorSummary => {
    const volumeAdapter = dex.module
    if (!volumeAdapter) throw Error("No volumeAdapter found")
    const includedVolume = config[volumeAdapter].includedVolume
    if (includedVolume && includedVolume.length > 0) {
        const includedSummaries = dexs.filter(dex => {
            const volumeAdapter = dex.module
            if (!volumeAdapter) throw Error("No volumeAdapter found")
            includedVolume.includes(volumeAdapter)
        })
        let computedSummary: ProtocolAdaptorSummary = dex
        for (const includedSummary of includedSummaries) {
            const newSum = getSumAllDexsToday([computedSummary], includedSummary, baseTimestamp)
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

const removeVolumesObject = (dex: ProtocolAdaptorSummary) => {
    delete dex['volumes']
    // @ts-ignore ignore volumeAdapter is not optional
    delete dex['volumeAdapter']
    return dex
}

export const removeEventTimestampAttribute = (v: AdaptorRecord) => {
    delete v.data['eventTimestamp']
    return v
}

/* const getAllChainsUnique = (dexs: VolumeSummaryDex[]) => {
    const allChainsNotUnique = dexs.reduce((acc, { chains }) => chains !== null ? acc.concat(...chains) : acc, [] as string[])
    return allChainsNotUnique.filter((value, index, self) => {
        return self.indexOf(value) === index;
    })
} */

export const getAllChainsUniqueString = (chains: string[]) => {
    return chains.map(formatChain).filter((value, index, self) => {
        return self.indexOf(value) === index;
    })
}

export default wrap(handler);