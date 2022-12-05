import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap } from "../../db-utils/adaptor-record"
import allSettled from "promise.allsettled";
import { generateAggregatedVolumesChartData, generateByDexVolumesChartData, getSumAllDexsToday, IChartData, IChartDataByDex } from "../../utils/volumeCalcs";
import { formatChain } from "../../utils/getAllChainsFromAdaptors";
import { sendDiscordAlert } from "../../utils/notify";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import { IJSON, ProtocolAdaptor } from "../../data/types";
import loadAdaptorsData from "../../data"
import generateProtocolAdaptorSummary from "../helpers/generateProtocolAdaptorSummary";
import { delay } from "../triggerStoreAdaptorData";

export interface IGeneralStats {
    total24h: number | null;
    change_1d: number | null;
    change_7d: number | null;
    change_1m: number | null;
    breakdown24h: IRecordAdaptorRecordData | null
}

export type ProtocolAdaptorSummary = Pick<ProtocolAdaptor,
    'name'
    | 'disabled'
    | 'displayName'
    | 'chains'
    | 'module'
    | 'config'
    | 'category'
    | 'protocolType'
    | 'logo'
    | 'methodologyURL'
    | 'methodology'
    | 'allAddresses'
    | 'latestFetchIsOk'
> & {
    protocolsStats: ProtocolStats | null
    records: AdaptorRecord[] | null
    recordsMap: IJSON<AdaptorRecord> | null
    totalAllTime: number | null
} & IGeneralStats & ExtraTypes

type KeysToRemove = 'records' | 'config' | 'recordsMap' | 'allAddresses'
type ProtocolsResponse = Omit<ProtocolAdaptorSummary, KeysToRemove>
export type IGetOverviewResponseBody = IGeneralStats & {
    totalDataChart: IChartData,
    totalDataChartBreakdown: IChartDataByDex,
    protocols: ProtocolsResponse[]
    allChains: string[]
    errors?: string[]
}

type ExtraTypes = {
    dailyUserFees?: number | null
    dailyHoldersRevenue?: number | null
    dailyCreatorRevenue?: number | null
    dailySupplySideRevenue?: number | null
    dailyProtocolRevenue?: number | null
    dailyPremiumVolume?: number | null
}

export type ProtocolStats = (NonNullable<ProtocolAdaptor['protocolsData']>[string] & IGeneralStats)

export const DEFAULT_CHART_BY_ADAPTOR_TYPE: IJSON<AdaptorRecordType> = {
    [AdapterType.DEXS]: AdaptorRecordType.dailyVolume,
    [AdapterType.FEES]: AdaptorRecordType.dailyFees,
    [AdapterType.AGGREGATORS]: AdaptorRecordType.dailyVolume,
    [AdapterType.OPTIONS]: AdaptorRecordType.dailyNotionalVolume,
    [AdapterType.INCENTIVES]: AdaptorRecordType.tokenIncentives,
}

export const ACCOMULATIVE_ADAPTOR_TYPE: IJSON<AdaptorRecordType> = {
    [AdaptorRecordType.dailyVolume]: AdaptorRecordType.totalVolume,
    [AdaptorRecordType.dailyFees]: AdaptorRecordType.totalFees,
    [AdaptorRecordType.dailyNotionalVolume]: AdaptorRecordType.totalNotionalVolume,
    [AdaptorRecordType.dailyPremiumVolume]: AdaptorRecordType.totalPremiumVolume,
    [AdaptorRecordType.dailyRevenue]: AdaptorRecordType.totalRevenue,
    [AdaptorRecordType.dailyUserFees]: AdaptorRecordType.totalUserFees,
    [AdaptorRecordType.dailyHoldersRevenue]: AdaptorRecordType.totalHoldersRevenue,
    [AdaptorRecordType.dailyCreatorRevenue]: AdaptorRecordType.totalCreatorRevenue,
    [AdaptorRecordType.dailySupplySideRevenue]: AdaptorRecordType.totalSupplySideRevenue,
    [AdaptorRecordType.dailyProtocolRevenue]: AdaptorRecordType.totalProtocolRevenue,
}

const EXTRA_TYPES: IJSON<AdaptorRecordType[]> = {
    [AdapterType.FEES]: [
        AdaptorRecordType.dailyUserFees,
        AdaptorRecordType.dailyHoldersRevenue,
        AdaptorRecordType.dailyCreatorRevenue,
        AdaptorRecordType.dailySupplySideRevenue,
        AdaptorRecordType.dailyProtocolRevenue
    ],
    [AdapterType.OPTIONS]: [
        AdaptorRecordType.dailyPremiumVolume
    ]
}

export const getExtraTypes = (type: AdapterType) => EXTRA_TYPES[type] ?? []

// -> /overview/{type}/{chain}
export const handler = async (event: AWSLambda.APIGatewayEvent, enableAlerts: boolean = false): Promise<IResponse> => {
    const pathChain = event.pathParameters?.chain?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const excludeTotalDataChart = event.queryStringParameters?.excludeTotalDataChart?.toLowerCase() === 'true'
    const excludeTotalDataChartBreakdown = event.queryStringParameters?.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
    const rawDataType = event.queryStringParameters?.dataType
    const rawCategory = event.queryStringParameters?.category
    const category = rawCategory === 'dexs' ? 'dexes' : rawCategory
    const fullChart = event.queryStringParameters?.fullChart?.toLowerCase() === 'true'
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    const chainFilter = pathChain ? decodeURI(pathChain) : pathChain

    if (!adaptorType) throw new Error("Missing parameter")

    // Import data list
    const adapters2load: string[] = [adaptorType, "protocols"]
    const protocolsList = Object.keys(loadAdaptorsData(adaptorType).config)
    const adaptersList: ProtocolAdaptor[] = []
    for (const type2load of adapters2load) {
        try {
            const adaptorsData = loadAdaptorsData(type2load as AdapterType)
            adaptorsData.default.forEach(va => {
                if (va.config?.enabled && (!category || va.category?.toLowerCase() === category))
                    if (protocolsList.includes(va.module)) adaptersList.push(va)
                return
            })
        } catch (error) {
            console.error(error)
        }
    }

    const errors: string[] = []
    const results = await allSettled(adaptersList.map(async (adapter) => {
        return generateProtocolAdaptorSummary(adapter, dataType, adaptorType, chainFilter, async (e) => {
            // console.error(e)
            // TODO, move error handling to rejected promises
            if (enableAlerts && !adapter.disabled) {
                errors.push(e.message)
                //await sendDiscordAlert(e.message).catch(e => console.log("discord error", e))
            }
        })
    }))
    for (const errorMSG of errors) {
        await sendDiscordAlert(errorMSG).catch(e => console.log("discord error", e))
        await delay(1000)
    }

    // Handle rejected dexs
    const rejectedDexs = results.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)


    const okProtocols = results.map(fd => fd.status === "fulfilled" && fd.value.records !== null ? fd.value : undefined).filter(d => d !== undefined) as ProtocolAdaptorSummary[]
    let totalDataChartResponse: IGetOverviewResponseBody['totalDataChart'] = excludeTotalDataChart ? [] : generateAggregatedVolumesChartData(okProtocols)
    let totalDataChartBreakdownResponse: IGetOverviewResponseBody['totalDataChartBreakdown'] = excludeTotalDataChartBreakdown ? [] : generateByDexVolumesChartData(okProtocols)

    // This could be avoided/optimized if moved to generateAggregatedVolumesChartData
    if (!fullChart) {
        totalDataChartResponse = totalDataChartResponse.slice(
            totalDataChartResponse.findIndex(it => it[1] !== 0),
            totalDataChartResponse.length - [...totalDataChartResponse].reverse().findIndex(it => it[1] !== 0)
        )
    }
    // This could be avoided/optimized if moved to generateByDexVolumesChartData
    if (!fullChart) {
        const sumBreakdownItem = (item: { [chain: string]: number }) => Object.values(item).reduce((acc, current) => acc += current, 0)
        totalDataChartBreakdownResponse = totalDataChartBreakdownResponse.slice(
            totalDataChartBreakdownResponse.findIndex(it => sumBreakdownItem(it[1]) !== 0),
            totalDataChartBreakdownResponse.length - [...totalDataChartBreakdownResponse].reverse().findIndex(it => sumBreakdownItem(it[1]) !== 0)
        )
    }

    const baseRecord = totalDataChartResponse[totalDataChartResponse.length - 1]
    const generalStats = getSumAllDexsToday(okProtocols.map(substractSubsetVolumes), undefined, baseRecord ? +baseRecord[0] : undefined)

    const enableStats = okProtocols.filter(okp => !okp.disabled).length > 0

    okProtocols.forEach(removeVolumesObject)
    const successResponseObj: IGetOverviewResponseBody = {
        totalDataChart: totalDataChartResponse,
        totalDataChartBreakdown: totalDataChartBreakdownResponse,
        protocols: okProtocols,
        allChains: getAllChainsUniqueString(adaptersList.reduce(((acc, protocol) => ([...acc, ...protocol.chains])), [] as string[])),
        total24h: enableStats ? generalStats.total24h : 0,
        change_1d: enableStats ? generalStats.change_1d : null,
        change_7d: enableStats ? generalStats.change_7d : null,
        change_1m: enableStats ? generalStats.change_1m : null,
        breakdown24h: enableStats ? generalStats.breakdown24h : null
    }
    if (enableAlerts) {
        successResponseObj['errors'] = errors
    }
    return successResponse(successResponseObj, 10 * 60); // 10 mins cache
};

const substractSubsetVolumes = (dex: ProtocolAdaptorSummary, _index: number, dexs: ProtocolAdaptorSummary[], baseTimestamp?: number): ProtocolAdaptorSummary => {
    const includedVolume = dex.config?.includedVolume
    if (includedVolume && includedVolume.length > 0) {
        const includedSummaries = dexs.filter(dex => includedVolume.includes(dex.module))
        let computedSummary: ProtocolAdaptorSummary = dex
        for (const includedSummary of includedSummaries) {
            const newSum = getSumAllDexsToday([computedSummary], includedSummary, baseTimestamp)
            computedSummary = {
                ...includedSummary,
                total24h: newSum['total24h'],
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

const removeVolumesObject = (protocol: WithOptional<ProtocolAdaptorSummary, KeysToRemove>): ProtocolsResponse => {
    delete protocol['records']
    delete protocol['config']
    delete protocol['recordsMap']
    delete protocol['allAddresses']
    return protocol
}

export const removeEventTimestampAttribute = (v: AdaptorRecord) => {
    delete v.data['eventTimestamp']
    return v
}

export const getAllChainsUniqueString = (chains: string[]) => {
    return chains.map(formatChain).filter((value, index, self) => {
        return self.indexOf(value) === index;
    })
}

export default wrap(handler);