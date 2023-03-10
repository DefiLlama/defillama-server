import { successResponse, wrap, IResponse, notFoundResponse } from "../../../utils/shared";
import sluggify, { sluggifyString } from "../../../utils/sluggify";
import { getAdaptorRecord, AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap } from "../../db-utils/adaptor-record";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import loadAdaptorsData from "../../data"
import { AdaptorData, IJSON, ProtocolAdaptor } from "../../data/types";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import generateProtocolAdaptorSummary from "../helpers/generateProtocolAdaptorSummary";
import { generateAggregatedVolumesChartData, generateByDexVolumesChartData, IChartData, IChartDataBreakdown, sumAllVolumes } from "../../utils/volumeCalcs";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE, IGetOverviewResponseBody, ProtocolAdaptorSummary } from "../getOverviewProcess";
import parentProtocols from "../../../protocols/parentProtocols";
import standardizeProtocolName from "../../../utils/standardizeProtocolName";
import { IParentProtocol } from "../../../protocols/types";
import { notNull, notUndefined } from "../../data/helpers/generateProtocolAdaptorsList";

export interface ChartItem {
    data: IRecordAdaptorRecordData;
    timestamp: number;
}
export interface IHandlerBodyResponse extends
    Omit<Pick<ProtocolAdaptor,
        "name"
        | "displayName"
        | "logo"
        | "address"
        | "url"
        | "description"
        | "audits"
        | "category"
        | "twitter"
        | "audit_links"
        | "forkedFrom"
        | "gecko_id"
        | "disabled"
        | "module"
        | "chains"
        | "methodologyURL"
        | 'allAddresses'
    >, 'module' | 'methodologyURL'> {
    totalDataChart: IChartData | null
    totalDataChartBreakdown: IChartDataBreakdown | null
    total24h: number | null
    change_1d: number | null
    totalAllTime: number | null
    latestFetchIsOk: boolean
    methodologyURL: string | null
    module: string | null
    childProtocols: string[] | null
}

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const protocolName = event.pathParameters?.name?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const rawDataType = event.queryStringParameters?.dataType
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    if (!protocolName || !adaptorType) throw new Error("Missing name or type")
    if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
    if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")


    const dexData = getProtocolData(protocolName, adaptorType)
    if (dexData) {
        const dexDataResponse = await getProtocolSummary(dexData, dataType, adaptorType)
        delete dexDataResponse.generatedSummary
        return successResponse(dexDataResponse as IHandlerBodyResponse, 10 * 60); // 10 mins cache
    }

    const parentData = parentProtocols.find(pp => pp.name.toLowerCase() === standardizeProtocolName(protocolName))
    if (parentData) {
        const parentResponse = await getProtocolSummaryParent(parentData, dataType, adaptorType)
        return successResponse(parentResponse as IHandlerBodyResponse, 10 * 60); // 10 mins cache
    }

    return notFoundResponse({
        message: `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`
    }, 10 * 60)
};

const getProtocolSummary = async (dexData: ProtocolAdaptor, dataType: AdaptorRecordType, adaptorType: AdapterType): Promise<IHandlerBodyResponse & { generatedSummary?: ProtocolAdaptorSummary }> => {
    let dexDataResponse = {} as IHandlerBodyResponse
    try {
        const generatedSummary = await generateProtocolAdaptorSummary(dexData, dataType, adaptorType)

        dexDataResponse = {
            name: generatedSummary.name,
            displayName: generatedSummary.displayName,
            disabled: generatedSummary.disabled,
            logo: dexData.logo,
            address: dexData.address,
            url: dexData.url,
            description: dexData.description,
            audits: dexData.audits,
            category: generatedSummary.category,
            twitter: dexData.twitter,
            audit_links: dexData.audit_links,
            forkedFrom: dexData.forkedFrom,
            gecko_id: dexData.gecko_id,
            totalDataChart: generatedSummary.records?.map(record => ([record.timestamp, sumAllVolumes(record.data)])) ?? null,
            totalDataChartBreakdown: generatedSummary.records?.map(record => ([record.timestamp, record.data])) ?? null,
            total24h: generatedSummary.total24h,
            total48hto24h: generatedSummary.total48hto24h,
            total14dto7d: generatedSummary.total14dto7d,
            totalAllTime: generatedSummary.totalAllTime,
            change_1d: generatedSummary.change_1d,
            module: dexData.module,
            protocolType: generatedSummary.protocolType,
            chains: generatedSummary.chains,
            methodologyURL: generatedSummary.methodologyURL,
            allAddresses: generatedSummary.allAddresses,
            latestFetchIsOk: generatedSummary.latestFetchIsOk,
            parentProtocol: generatedSummary.parentProtocol,
            generatedSummary,
            childProtocols: null
        } as IHandlerBodyResponse
    } catch (error) {
        console.error(`Error generating summary for ${dexData.module} ${JSON.stringify(error)}`)
        dexDataResponse = {
            name: dexData.name,
            displayName: dexData.displayName,
            logo: dexData.logo,
            address: dexData.address,
            url: dexData.url,
            description: dexData.description,
            audits: dexData.audits,
            category: dexData.category,
            twitter: dexData.twitter,
            audit_links: dexData.audit_links,
            forkedFrom: dexData.forkedFrom,
            gecko_id: dexData.gecko_id,
            disabled: dexData.disabled,
            latestFetchIsOk: false,
            chains: dexData.chains,
            totalDataChart: null,
            totalDataChartBreakdown: null,
            total24h: null,
            totalAllTime: null,
            change_1d: null,
            childProtocols: null
        } as IHandlerBodyResponse
    }
    return dexDataResponse
}

const getProtocolSummaryParent = async (parentData: IParentProtocol, dataType: AdaptorRecordType, adaptorType: AdapterType): Promise<IHandlerBodyResponse> => {
    const adaptorsData = loadAdaptorsData(adaptorType as AdapterType)
    const childs = adaptorsData.default.reduce((acc, curr) => {
        const parentId = curr.parentProtocol
        if (parentId)
            acc[parentId] = acc[parentId] ? [...acc[parentId], curr] : [curr]
        return acc
    }, {} as IJSON<ProtocolAdaptor[]>)[parentData.id]
    const summaries = await Promise.all(childs.map(child => getProtocolSummary(child, dataType, adaptorType)))
    const totalToday = sumReduce(summaries, 'total24h')
    const totalYesterday = sumReduce(summaries, 'total48hto24h')
    const change_1d = (totalToday && totalYesterday) ? ((totalToday - totalYesterday) / totalYesterday) * 100 : null
    return {
        ...parentData,
        displayName: parentData.name,
        total24h: totalToday,
        totalAllTime: sumReduce(summaries, 'totalAllTime'),
        latestFetchIsOk: true,
        disabled: false,
        change_1d,
        methodologyURL: null,
        module: null,
        totalDataChartBreakdown: null,
        totalDataChart: generateAggregatedVolumesChartData(summaries.map((s) => s.generatedSummary).filter(notUndefined)),
        childProtocols: summaries.map(s => s.displayName)
    }
}


const sumReduce = (summaries: IJSON<any>[], key: string) => summaries.reduce((acc, curr) => {
    if (curr[key]) return typeof acc === 'number' ? acc += curr[key] : curr[key]
    return acc
}, null as number | null)

const getProtocolData = (protocolName: string, adaptorType: AdapterType) => {
    // Import data list
    const adapters2load: string[] = [adaptorType, "protocols"]
    const protocolsList = Object.keys(loadAdaptorsData(adaptorType).config)
    let dexData: ProtocolAdaptor | undefined = undefined
    let adaptorsData: AdaptorData | undefined = undefined
    for (const type2load of adapters2load) {
        try {
            adaptorsData = loadAdaptorsData(type2load as AdapterType)
            dexData = adaptorsData.default
                .find(va => protocolsList.includes(va.module)
                    && (sluggifyString(va.name) === protocolName || sluggifyString(va.displayName) === protocolName)
                )
            if (dexData) break
        } catch (error) {
            console.error(`Couldn't load adaptors with type ${type2load} :${JSON.stringify(error)}`)
        }
    }
    return dexData
}

const formatChartHistory = (volumes: AdaptorRecord[] | null) => {
    if (volumes === null) return []
    return volumes.map<ChartItem>(v => ({
        data: v.data,
        timestamp: v.sk
    }))
}

export default wrap(handler);