import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { getAdaptorRecord, AdaptorRecord, AdaptorRecordType, IRecordAdapterRecordChainData } from "../../db-utils/adaptor-record"
import allSettled from "promise.allsettled";

import { calcNdChange, generateAggregatedVolumesChartData, generateByDexVolumesChartData, getSumAllDexsToday, getStatsByProtocolVersion, IChartData, IChartDataByDex, sumAllVolumes } from "../../utils/volumeCalcs";
import { formatTimestampAsDate, getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { formatChain } from "../../utils/getAllChainsFromAdaptors";
import config from "../../data/volumes/config";
import { ONE_DAY_IN_SECONDS } from "../getDexVolume";
import { sendDiscordAlert } from "../../utils/notify";
import { Adapter, AdapterType } from "@defillama/adaptors/adapters/types";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import { IJSON, ProtocolAdaptor } from "../../data/types";
import loadAdaptorsData from "../../data"
import generateCleanRecords from "../helpers/generateCleanRecords";

export interface IGeneralStats {
    totalVolume24h: number | null;
    change_1d: number | null;
    change_7d: number | null;
    change_1m: number | null;
    volume24hBreakdown: IRecordAdaptorRecordData | null
}

export type IGetDexsResponseBody = IGeneralStats & {
    totalDataChart: IChartData,
    totalDataChartBreakdown: IChartDataByDex,
    dexs: Omit<ProtocolAdaptorSummary, 'volumes' | 'module'>[]
    allChains: string[]
}

export interface ProtocolAdaptorSummary extends Pick<ProtocolAdaptor,
    'name'
    | 'disabled'
    | 'displayName'
    | 'chains'
    | 'module'
> {
    totalVolume24h: number | null
    volume24hBreakdown: IRecordAdaptorRecordData | null
    volumes: AdaptorRecord[] | null
    change_1d: number | null
    change_7d: number | null
    change_1m: number | null
    chains: string[]
    protocolsStats: ProtocolStats | null
}

type ProtocolStats = (NonNullable<ProtocolAdaptor['protocolsData']>[string] & IGeneralStats)

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

    const results = await allSettled(adaptorsData.default.filter(va => va.config?.enabled).map<Promise<ProtocolAdaptorSummary>>(async (adapter) => {
        try {
            // Get all records from db
            let adaptorRecords = (await getAdaptorRecord(adapter.id, DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType] as AdaptorRecordType))

            // This check is made to infer AdaptorRecord[] type instead of AdaptorRecord type
            if (!(adaptorRecords instanceof Array)) throw new Error("Wrong volume queried")

            // Clean data by chain
            adaptorRecords = generateCleanRecords(
                adaptorRecords,
                adapter.chains,
                adapter.protocolsData ? Object.keys(adapter.protocolsData) : [adapter.module],
                chainFilter
            )
            if (adaptorRecords.length === 0) throw new Error(`${adapter.name} has no records stored${chainFilter ? ` for chain ${chainFilter}` : ''}`)

            // Calc stats with last available data
            const yesterdaysCleanTimestamp = getTimestampAtStartOfDayUTC((Date.now() - ONE_DAY_IN_SECONDS * 1000) / 1000)
            const lastAvailableDataTimestamp = adaptorRecords[adaptorRecords.length - 1].timestamp
            const stats = getStats(adapter, adaptorRecords, lastAvailableDataTimestamp)
            const protocolVersions = getProtocolVersionStats(adapter, adaptorRecords, lastAvailableDataTimestamp)

            // Check if data looks is valid. Not sure if this should be added
            if (
                adaptorRecords.length !== 1
                && (
                    !stats.change_1d
                    || (stats.change_1d && (stats.change_1d < -99 || stats.change_1d > 10 * 100))
                )
            ) {
                if (enableAlerts) //Move alert to error handler
                    await sendDiscordAlert(`${adapter.name} has a daily change of ${stats.change_1d}, looks sus... Not including in the response`)
                console.error(`${adapter.name} has a daily change of ${stats.change_1d}, looks sus... Not including in the response`)
            }

            // Populate last missing days with last available data
            for (let i = lastAvailableDataTimestamp + ONE_DAY_IN_SECONDS; i <= yesterdaysCleanTimestamp; i += ONE_DAY_IN_SECONDS)
                adaptorRecords.push(new AdaptorRecord(adaptorRecords[0].type, adaptorRecords[0].adaptorId, i, adaptorRecords[0].data))

            return {
                name: adapter.name,
                disabled: adapter.disabled,
                displayName: adapter.displayName,
                module: adapter.module,
                volumes: adaptorRecords,
                change_1d: stats.change_1d,
                change_7d: stats.change_7d,
                change_1m: stats.change_1m,
                totalVolume24h: stats.totalVolume24h,
                volume24hBreakdown: stats.volume24hBreakdown,
                chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains,
                protocolsStats: protocolVersions

            }
        } catch (error) {
            console.error("ADAPTER", adapter.name, error)
            // TODO: handle better errors
            return {
                name: adapter.name,
                module: adapter.module,
                disabled: adapter.disabled,
                displayName: adapter.displayName,
                totalVolume24h: null,
                volume24hBreakdown: null,
                yesterdayTotalVolume: null,
                change_1d: null,
                volumes: null,
                change_7d: null,
                change_1m: null,
                chains: chainFilter ? [formatChain(chainFilter)] : adapter.chains.map(formatChain),
                protocolsStats: null
            }
        }
    }))

    // Handle rejected dexs
    const rejectedDexs = results.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)


    const okProtocols = results.map(fd => fd.status === "fulfilled" && fd.value.disabled !== null ? fd.value : undefined).filter(d => d !== undefined) as ProtocolAdaptorSummary[]
    const generalStats = getSumAllDexsToday(okProtocols.map(substractSubsetVolumes))

    let dexsResponse: IGetDexsResponseBody['dexs']
    let totalDataChartResponse: IGetDexsResponseBody['totalDataChart']
    let totalDataChartBreakdownResponse: IGetDexsResponseBody['totalDataChartBreakdown']

    if (chainFilter) {
        totalDataChartResponse = excludeTotalDataChart ? [] : generateAggregatedVolumesChartData(okProtocols)
        totalDataChartBreakdownResponse = excludeTotalDataChartBreakdown ? [] : generateByDexVolumesChartData(okProtocols)
        dexsResponse = okProtocols.map(removeVolumesObject)
    } else {
        totalDataChartResponse = excludeTotalDataChart ? [] : generateAggregatedVolumesChartData(okProtocols)
        totalDataChartBreakdownResponse = excludeTotalDataChartBreakdown ? [] : generateByDexVolumesChartData(okProtocols)
        dexsResponse = okProtocols.map(removeVolumesObject)
    }

    totalDataChartResponse = totalDataChartResponse.slice(totalDataChartResponse.findIndex(it => it[1] !== 0))
    const sumBreakdownItem = (item: { [chain: string]: number }) => Object.values(item).reduce((acc, current) => acc += current, 0)
    totalDataChartBreakdownResponse = totalDataChartBreakdownResponse.slice(totalDataChartBreakdownResponse.findIndex(it => sumBreakdownItem(it[1]) !== 0))

    return successResponse({
        totalDataChart: totalDataChartResponse,
        totalDataChartBreakdown: totalDataChartBreakdownResponse,
        dexs: dexsResponse,
        allChains: getAllChainsUniqueString(okProtocols.reduce(((acc, protocol) => ([...acc, ...protocol.chains])), [] as string[])),
        ...generalStats,
    } as IGetDexsResponseBody, 10 * 60); // 10 mins cache
};

const getStats = (adapter: ProtocolAdaptor, adaptorRecords: AdaptorRecord[], baseTimestamp: number): IGeneralStats => {
    return {
        change_1d: calcNdChange(adaptorRecords, 1, baseTimestamp, true),
        change_7d: calcNdChange(adaptorRecords, 7, baseTimestamp, true),
        change_1m: calcNdChange(adaptorRecords, 30, baseTimestamp, true),
        totalVolume24h: adapter.disabled ? null : sumAllVolumes(adaptorRecords[adaptorRecords.length - 1].data),
        volume24hBreakdown: adapter.disabled ? null : adaptorRecords[adaptorRecords.length - 1].data
    }
}

const getProtocolVersionStats = (adapterData: ProtocolAdaptor, adaptorRecords: AdaptorRecord[], baseTimestamp: number) => {
    if (!adapterData.protocolsData) return null
    const protocolVersionsStats = getStatsByProtocolVersion(adaptorRecords, baseTimestamp, adapterData.protocolsData)
    return Object.entries(adapterData.protocolsData)
        .reduce((acc, [protKey, data]) => ({
            ...acc,
            [protKey]: {
                ...data,
                ...protocolVersionsStats[protKey],
            }
        }), {} as ProtocolStats)
}

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
                totalVolume24h: newSum['totalVolume24h'],
                change_1d: newSum['change_1d'],
                change_7d: newSum['change_7d'],
                change_1m: newSum['change_1m'],
            }
        }
        return computedSummary
    }
    else
        return dex
}

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const removeVolumesObject = (dex: WithOptional<ProtocolAdaptorSummary, 'volumes' | 'module'>) => {
    delete dex['volumes']
    delete dex['module']
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

export const getStringArrUnique = (arr: string[]) => {
    return arr.filter((value, index, self) => {
        return self.indexOf(value) === index;
    })
}

export default wrap(handler);