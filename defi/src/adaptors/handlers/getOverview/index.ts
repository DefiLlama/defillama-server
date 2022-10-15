import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { AdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record"
import allSettled from "promise.allsettled";

import {  generateAggregatedVolumesChartData, generateByDexVolumesChartData, getSumAllDexsToday, getStatsByProtocolVersion, IChartData, IChartDataByDex, sumAllVolumes } from "../../utils/volumeCalcs";
import { formatChain } from "../../utils/getAllChainsFromAdaptors";
import config from "../../data/volumes/config";
import { sendDiscordAlert } from "../../utils/notify";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import { IJSON, ProtocolAdaptor } from "../../data/types";
import loadAdaptorsData from "../../data"
import generateProtocolAdaptorSummary from "../helpers/generateProtocolAdaptorSummary";

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

export type ProtocolStats = (NonNullable<ProtocolAdaptor['protocolsData']>[string] & IGeneralStats)

export const DEFAULT_CHART_BY_ADAPTOR_TYPE: IJSON<string> = {
    [AdapterType.VOLUME]: AdaptorRecordType.dailyVolumeRecord,
    [AdapterType.FEES]: AdaptorRecordType.dailyFeesRecord
}

// -> /overview/volumes
// -> /overview/volumes/ethereum
// -> /overview/fees/
// -> /overview/fees/ethereum
export const handler = async (event: AWSLambda.APIGatewayEvent, enableAlerts: boolean = false): Promise<IResponse> => {
    const pathChain = event.pathParameters?.chain?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const excludeTotalDataChart = event.queryStringParameters?.excludeTotalDataChart?.toLowerCase() === 'true'
    const excludeTotalDataChartBreakdown = event.queryStringParameters?.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
    const chainFilter = pathChain ? decodeURI(pathChain) : pathChain

    if (!adaptorType) throw new Error("Missing parameter")

    // Import data list
    const adaptorsData = loadAdaptorsData(adaptorType)

    const results = await allSettled(adaptorsData.default.filter(va => va.config?.enabled).map<Promise<ProtocolAdaptorSummary>>(async (adapter) => {
        return generateProtocolAdaptorSummary(adapter, adaptorType, chainFilter, async (e) => {
            console.error(e)
            // TODO, move error handling to rejected promises
            if (enableAlerts)
                await sendDiscordAlert(e.message)
        })
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

export default wrap(handler);