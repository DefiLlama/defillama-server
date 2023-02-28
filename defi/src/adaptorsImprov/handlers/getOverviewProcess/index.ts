import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap, AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record"
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
import { notUndefined } from "../../data/helpers/generateProtocolAdaptorsList";
import { cacheResponseOnR2 } from "../../utils/storeR2Response";
import { CATEGORIES } from "../../data/helpers/categories";

export interface IGeneralStats extends ExtraTypes {
    total24h: number | null;
    total7d: number | null;
    total30d: number | null;
    change_1d: number | null;
    change_7d: number | null;
    change_1m: number | null;
    change_7dover7d: number | null;
    change_30dover30d: number | null;
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
> & {
    records: AdaptorRecord[] | null
    recordsMap: IJSON<AdaptorRecord> | null
    totalAllTime: number | null
    latestFetchIsOk: boolean
    spikes?: string
} & IGeneralStats & ExtraTypes

type KeysToRemove = 'records' | 'config' | 'recordsMap' | 'allAddresses' | 'spikes'
type ProtocolsResponse = Omit<ProtocolAdaptorSummary, KeysToRemove>
export type IGetOverviewResponseBody = IGeneralStats & {
    totalDataChart?: IChartData,
    totalDataChartBreakdown?: IChartDataByDex,
    protocols: ProtocolsResponse[]
    allChains: string[]
    errors?: string[]
}

export type ExtraTypes = {
    dailyRevenue?: number | null
    dailyUserFees?: number | null
    dailyHoldersRevenue?: number | null
    dailyCreatorRevenue?: number | null
    dailySupplySideRevenue?: number | null
    dailyProtocolRevenue?: number | null
    dailyPremiumVolume?: number | null
}

export type ProtocolStats = IJSON<(NonNullable<IGeneralStats>)>

export const DEFAULT_CHART_BY_ADAPTOR_TYPE: IJSON<AdaptorRecordType> = {
    [AdapterType.DEXS]: AdaptorRecordType.dailyVolume,
    [AdapterType.DERIVATIVES]: AdaptorRecordType.dailyVolume,
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
        AdaptorRecordType.dailyRevenue,
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

export interface IGetOverviewEventParams {
    pathParameters: {
        type: AdapterType
        chain?: string
    }
    queryStringParameters: {
        excludeTotalDataChart?: string
        excludeTotalDataChartBreakdown?: string
        dataType?: string
        category?: string
        fullChart?: string
    }
}

export const getOverviewCachedResponseKey = (
    adaptorType: string,
    chainFilter?: string,
    dataType?: string,
    category?: string,
    fullChart?: string
) => `overviewImprov/${adaptorType}/${dataType}/${chainFilter}_${category}_${fullChart}`

// -> /overview/{type}/{chain}
export const handler = async (event: AWSLambda.APIGatewayEvent, enableAlerts: boolean = false): Promise<IResponse> => {
    console.info("Event received", JSON.stringify(event))
    const pathChain = event.pathParameters?.chain?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const excludeTotalDataChart = event.queryStringParameters?.excludeTotalDataChart?.toLowerCase() === 'true'
    const excludeTotalDataChartBreakdown = event.queryStringParameters?.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
    const rawDataType = event.queryStringParameters?.dataType
    const rawCategory = event.queryStringParameters?.category
    const category = (rawCategory === 'dexs' ? 'dexes' : rawCategory) as CATEGORIES
    const fullChart = event.queryStringParameters?.fullChart?.toLowerCase() === 'true'
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    const chainFilter = pathChain ? decodeURI(pathChain) : pathChain
    console.info("Parameters parsing OK")

    if (!adaptorType) throw new Error("Missing parameter")
    if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
    if (category !== undefined && !Object.values(CATEGORIES).includes(category)) throw new Error("Category not supported")
    if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")

    // Import data list
    console.info("Loading adaptors...")
    const loadedAdaptors = loadAdaptorsData(adaptorType)
    const protocolsList = Object.keys(loadedAdaptors.config)
    const adaptersList: ProtocolAdaptor[] = []
    try {
        loadedAdaptors.default.forEach(va => {
            if (protocolsList.includes(va.module))
                if (loadedAdaptors.config[va.module]?.enabled && (!category || va.category?.toLowerCase() === category))
                    adaptersList.push(va)
            return
        })
    } catch (error) {
        console.error(`Couldn't load adaptors with type ${adaptorType} :${JSON.stringify(error)}`, error)
    }
    console.info("Loaded OK:", adaptersList.length)
    const allChains = getAllChainsUniqueString(adaptersList.reduce(((acc, protocol) => ([...acc, ...protocol.chains])), [] as string[]))
    if (chainFilter !== undefined && !allChains.map(c => c.toLowerCase()).includes(chainFilter)) throw new Error(`Chain not supported ${chainFilter}`)

    const errors: string[] = []
    const results = await allSettled(adaptersList.map(async (adapter) => {
        return generateProtocolAdaptorSummary(adapter, dataType, adaptorType, chainFilter, async (e) => {
            console.error("Error generating summary:", adapter.module, e) // this should be a warning
            // TODO, move error handling to rejected promises
            if (enableAlerts && !adapter.disabled) {
                errors.push(e.message)
                //await sendDiscordAlert(e.message).catch(e => console.log("discord error", e))
            }
        })
    }))

    console.info("Sending discord alerts:", errors.length)
    for (const errorMSG of errors) {
        await sendDiscordAlert(errorMSG, adaptorType).catch(e => console.log("discord error", e))
        await delay(1000)
    }

    // Handle rejected dexs
    const rejectedDexs = results.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(rd => {
        console.error(`Couldn't summarize ${JSON.stringify(rd)}`, rd)
    })

    const okProtocols = results.map(fd => fd.status === "fulfilled" && fd.value.records !== null ? fd.value : undefined).filter(d => d !== undefined) as ProtocolAdaptorSummary[]
    console.info("Fullfiled results:", okProtocols.length)
    console.info("Creating charts...")
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
    console.info("Charts OK")
    console.info("Calculating stats...")
    const extraTypes = (getExtraTypes(adaptorType) as string[]).map(type => AdaptorRecordTypeMapReverse[type]).filter(notUndefined) as (keyof ExtraTypes)[]
    const baseRecord = totalDataChartResponse[totalDataChartResponse.length - 1]
    const generalStats = getSumAllDexsToday(okProtocols.map(substractSubsetVolumes), undefined, baseRecord ? +baseRecord[0] : undefined, extraTypes)
    console.info("Stats OK")

    for (const { spikes } of okProtocols) {
        if (spikes) {
            await sendDiscordAlert(spikes, adaptorType).catch(e => console.log("discord error", e))
            await delay(1000)
        }
    }

    const enableStats = okProtocols.filter(okp => !okp.disabled).length > 0
    okProtocols.forEach(removeVolumesObject)
    const successResponseObj: IGetOverviewResponseBody = {
        totalDataChart: totalDataChartResponse,
        totalDataChartBreakdown: totalDataChartBreakdownResponse,
        protocols: okProtocols,
        allChains,
        total24h: enableStats ? generalStats.total24h : 0,
        total7d: enableStats ? generalStats.total7d : 0,
        total30d: enableStats ? generalStats.total30d : 0,
        change_1d: enableStats ? generalStats.change_1d : null,
        change_7d: enableStats ? generalStats.change_7d : null,
        change_1m: enableStats ? generalStats.change_1m : null,
        change_7dover7d: enableStats ? generalStats.change_7dover7d : null,
        change_30dover30d: enableStats ? generalStats.change_30dover30d : null,
        breakdown24h: enableStats ? generalStats.breakdown24h : null,
        ...enableStats ? (extraTypes.reduce((acc, curr) => {
            if (generalStats[curr])
                acc[curr] = generalStats[curr]
            return acc
        }, {} as typeof generalStats)) : undefined
    }
    if (enableAlerts) {
        successResponseObj['errors'] = errors
    }
    console.info("Storing response to R2")
    await cacheResponseOnR2(getOverviewCachedResponseKey(adaptorType, chainFilter, dataType, category, String(fullChart)), JSON.stringify(successResponseObj))
        .then(() => console.info("Stored R2 OK")).catch(e => console.error("Unable to cache...", e))
    // console.info("Returning response:", JSON.stringify(successResponseObj))
    return successResponse(successResponseObj, 10 * 60); // 10 mins cache
};

const substractSubsetVolumes = (adapter: ProtocolAdaptorSummary, _index: number, dexs: ProtocolAdaptorSummary[], baseTimestamp?: number): ProtocolAdaptorSummary => {
    const includedVolume = adapter.config?.includedVolume // needs to get config from getConfigByType
    if (includedVolume && includedVolume.length > 0) {
        const includedSummaries = dexs.filter(dex => includedVolume.includes(dex.module))
        let computedSummary: ProtocolAdaptorSummary = adapter
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
        return adapter
}

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

const removeVolumesObject = (protocol: WithOptional<ProtocolAdaptorSummary, KeysToRemove>): ProtocolsResponse => {
    delete protocol['records']
    delete protocol['config']
    delete protocol['recordsMap']
    delete protocol['allAddresses']
    delete protocol['spikes']
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
