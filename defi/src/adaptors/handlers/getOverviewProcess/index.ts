import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap, AdaptorRecordTypeMapReverse } from "../../db-utils/adaptor-record"
import allSettled from "promise.allsettled";
import { generateAggregatedVolumesChartData, generateByDexVolumesChartData, getSumAllDexsToday, IChartData, IChartDataByDex } from "../../utils/volumeCalcs";
import { formatChainKey, getDisplayChainName } from "../../utils/getAllChainsFromAdaptors";
import { sendDiscordAlert } from "../../utils/notify";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import { IJSON, ProtocolAdaptor } from "../../data/types";
import loadAdaptorsData from "../../data"
import generateProtocolAdaptorSummary from "../helpers/generateProtocolAdaptorSummary";
import { delay } from "../triggerStoreAdaptorData";
import { notUndefined } from "../../data/helpers/generateProtocolAdaptorsList";
import { cacheResponseOnR2, } from "../../utils/storeR2Response";
import { CATEGORIES } from "../../data/helpers/categories";
import processEventParameters from "../helpers/processEventParameters";

export interface IGeneralStats extends ExtraTypes {
    total24h: number | null;
    total48hto24h: number | null;
    total7d: number | null;
    total14dto7d: number | null;
    total30d: number | null;
    total60dto30d: number | null;
    total1y: number | null;
    change_1d: number | null;
    change_7d: number | null;
    change_1m: number | null;
    totalVolume7d: number | null;
    totalVolume30d: number | null;
    change_7dover7d: number | null;
    change_30dover30d: number | null;
    breakdown24h: IRecordAdaptorRecordData | null
    average1y: number | null
}

export type ProtocolAdaptorSummary = Pick<ProtocolAdaptor,
    'name'
    | 'defillamaId'
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
    | 'parentProtocol'
    | 'versionKey'
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
    chain: string | null
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
    [AdapterType.ROYALTIES]: AdaptorRecordType.dailyFees,
    [AdapterType.AGGREGATOR_DERIVATIVES]: AdaptorRecordType.dailyVolume,
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
        AdaptorRecordType.dailyProtocolRevenue,
        AdaptorRecordType.dailyBribesRevenue,
        AdaptorRecordType.dailyTokenTaxes
    ],
    [AdapterType.ROYALTIES]: [
        AdaptorRecordType.dailyRevenue,
        AdaptorRecordType.dailyUserFees,
        AdaptorRecordType.dailyHoldersRevenue,
        AdaptorRecordType.dailyCreatorRevenue,
        AdaptorRecordType.dailySupplySideRevenue,
        AdaptorRecordType.dailyProtocolRevenue
    ],
    [AdapterType.OPTIONS]: [
        AdaptorRecordType.dailyPremiumVolume
    ],
    [AdapterType.DERIVATIVES]: [
        AdaptorRecordType.dailyShortOpenInterest,
        AdaptorRecordType.dailyLongOpenInterest,
        AdaptorRecordType.dailyOpenInterest
    ]
}

const EXTRA_N30D_TYPE: IJSON<AdaptorRecordType[]> = {
    [AdapterType.FEES]: [
        AdaptorRecordType.dailyHoldersRevenue,
        AdaptorRecordType.dailyBribesRevenue,
        AdaptorRecordType.dailyTokenTaxes,
    ],
}
export const getExtraN30DTypes = (type: AdapterType) => EXTRA_N30D_TYPE[type] ?? []

export const getExtraTypes = (type: AdapterType) => EXTRA_TYPES[type] ?? []
export const getAdapterRecordTypes = (type: AdapterType) => {
    return [DEFAULT_CHART_BY_ADAPTOR_TYPE[type], ...getExtraTypes(type)]
}

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
) => `overview/${adaptorType}/${dataType}/${chainFilter}_${category}_${fullChart}`

// -> /overview/{type}/{chain}
export async function getOverviewProcess({
    adaptorType,
    excludeTotalDataChart,
    excludeTotalDataChartBreakdown,
    category,
    fullChart,
    dataType,
    chainFilter,
    enableAlerts = false,
    isApi2RestServer = false,
}: any) {

    if (!adaptorType) throw new Error("Missing parameter")
    if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
    if (category !== undefined && !Object.values(CATEGORIES).includes(category)) throw new Error("Category not supported")
    if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")

    // Import data list
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
    if (chainFilter?.toLowerCase() === 'all') chainFilter = undefined
    const allChains = getAllChainsUniqueString(adaptersList.reduce(((acc, protocol) => ([...acc, ...protocol.chains])), [] as string[]))
    // if (chainFilter !== undefined && !allChains.map(c => c.toLowerCase()).includes(chainFilter)) throw new Error(`Chain not supported ${chainFilter}`)

    const errors: string[] = []
    const results = await allSettled(adaptersList.map(async (adapter) => {
        if (chainFilter && !adapter.chains.includes(formatChainKey(chainFilter))) return { records: null } as any
        return generateProtocolAdaptorSummary(adapter, dataType, adaptorType, chainFilter, async (e) => {
            if (!isApi2RestServer || process.env.API2_DEBUG_MODE)
                console.error("Error generating summary:", adapter.module, e) // this should be a warning
            // TODO, move error handling to rejected promises
            if (enableAlerts && !adapter.disabled) {
                errors.push(e.message)
                //await sendDiscordAlert(e.message).catch(e => console.log("discord error", e))
            }
        }, { isApi2RestServer })
    }))

    if (!isApi2RestServer)
        for (const errorMSG of errors) {
            await sendDiscordAlert(errorMSG, adaptorType).catch(e => console.log("discord error", e))
            await delay(750)
        }

    // Handle rejected dexs
    const rejectedDexs = results.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(rd => {
        console.error(`Couldn't summarize ${JSON.stringify(rd)}`, rd)
    })

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
    const extraTypes = (getExtraTypes(adaptorType) as string[]).map(type => AdaptorRecordTypeMapReverse[type]).filter(notUndefined) as (keyof ExtraTypes)[]
    const baseRecord = totalDataChartResponse[totalDataChartResponse.length - 1]
    const generalStats = getSumAllDexsToday(okProtocols.map(substractSubsetVolumes), undefined, baseRecord ? +baseRecord[0] : undefined, extraTypes)


    if (!isApi2RestServer)
        for (const { spikes } of okProtocols) {
            if (spikes) {
                await sendDiscordAlert(spikes, adaptorType, false).catch(e => console.log("discord error", e))
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
        chain: chainFilter ? getDisplayChainName(chainFilter) : null,
        total24h: enableStats ? generalStats.total24h : 0,
        total48hto24h: null,
        total7d: enableStats ? generalStats.total7d : 0,
        total14dto7d: enableStats ? generalStats.total14dto7d : 0,
        total60dto30d: enableStats ? generalStats.total60dto30d : 0,
        total30d: enableStats ? generalStats.total30d : 0,
        total1y: enableStats ? generalStats.total1y : 0,
        average1y: enableStats ? generalStats.average1y : null,
        change_1d: enableStats ? generalStats.change_1d : null,
        change_7d: enableStats ? generalStats.change_7d : null,
        change_1m: enableStats ? generalStats.change_1m : null,
        totalVolume7d: enableStats ? generalStats.totalVolume7d : null,
        totalVolume30d: enableStats ? generalStats.totalVolume30d : null,
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
    return successResponseObj
};

// -> /overview/{type}/{chain}
export const handler = async (event: AWSLambda.APIGatewayEvent, enableAlerts: boolean = false): Promise<IResponse> => {
    // console.info("Event received", JSON.stringify(event))
    const eventParams: any = processEventParameters(event)
    // console.info("Parameters parsing OK")
    eventParams.enableAlerts = enableAlerts
    const successResponseObj = await getOverviewProcess(eventParams)
    // console.info("Storing response to R2")
    const cacheKey = getOverviewCachedResponseKey(eventParams.adaptorType, eventParams.chainFilter, eventParams.dataType, eventParams.category, String(eventParams.fullChart))
    await cacheResponseOnR2(cacheKey, JSON.stringify(successResponseObj))
        .then(() => console.info("Stored R2 OK")).catch(e => console.error("Unable to cache...", e))
    // const cachedResponse = await getCachedResponseOnR2(cacheKey).catch(e => console.error("Failed to retrieve...", cacheKey, e))
    // console.log("cachedResponse", cachedResponse)
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
                totalVolume7d: newSum['totalVolume7d'],
                totalVolume30d: newSum['totalVolume30d'],
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
    return chains.map(getDisplayChainName).filter((value, index, self) => {
        return self.indexOf(value) === index;
    })
}

export default wrap(handler);
