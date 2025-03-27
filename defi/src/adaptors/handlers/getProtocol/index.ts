import { wrap, IResponse, notFoundResponse, dayCache } from "../../../utils/shared";
import { sluggifyString } from "../../../utils/sluggify";
import { AdaptorRecordType, AdaptorRecordTypeMap, IRecordAdapterRecordChainData } from "../../db-utils/adaptor-record";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import loadAdaptorsData from "../../data"
import { AdaptorData, IJSON, ProtocolAdaptor } from "../../data/types";
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import generateProtocolAdaptorSummary from "../helpers/generateProtocolAdaptorSummary";
import { formatNdChangeNumber, generateAggregatedVolumesChartDataImprov, generateByChainVolumesChartDataBreakdown, IChartDataBreakdown, IChartDatav2, sumAllVolumes } from "../../utils/volumeCalcs";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE, ProtocolAdaptorSummary } from "../getOverviewProcess";
import parentProtocols from "../../../protocols/parentProtocols";
import standardizeProtocolName from "../../../utils/standardizeProtocolName";
import { IParentProtocol } from "../../../protocols/types";
import { notUndefined } from "../../data/helpers/generateProtocolAdaptorsList";

export interface ChartItem {
    data: IRecordAdaptorRecordData;
    timestamp: number;
}
export interface IHandlerBodyResponse extends
    Omit<Pick<ProtocolAdaptor,
        "name"
        | "defillamaId"
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
    totalDataChart: IChartDatav2 | null
    totalDataChartBreakdown: IChartDataBreakdown | null
    total24h: number | null
    change_1d: number | null
    totalAllTime: number | null
    latestFetchIsOk: boolean
    methodologyURL: string | null
    methodology?: {[key: string]: string} | null
    module: string | null
    childProtocols: string[] | null
}

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const protocolName = event.pathParameters?.name?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const rawDataType = event.queryStringParameters?.dataType
    const data = await getProtocolDataHandler(protocolName, adaptorType, rawDataType)
    if (data) return dayCache(data as IHandlerBodyResponse)

    return notFoundResponse({
        message: `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`
    }, 60 * 60)
};

export async function getProtocolDataHandler(protocolName?: string, adaptorType?: AdapterType, rawDataType?: string, {
    isApi2RestServer = false
} = {}) {
    if (!protocolName || !adaptorType) throw new Error("Missing name or type")
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
    if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")

    const parentData = parentProtocols.find(pp => pp.name.toLowerCase() === standardizeProtocolName(protocolName))
    if (parentData) {
        return getProtocolSummaryParent(parentData, dataType, adaptorType, { isApi2RestServer })
    }

    const dexData = await getProtocolData(protocolName, adaptorType)
    if (dexData) {
        const dexDataResponse = await getProtocolSummary(dexData, dataType, adaptorType, { isApi2RestServer })
        delete dexDataResponse.generatedSummary
        return dexDataResponse
    }


}

const getProtocolSummary = async (dexData: ProtocolAdaptor, dataType: AdaptorRecordType, adaptorType: AdapterType, {
    isApi2RestServer = false
} = {}): Promise<IHandlerBodyResponse & { generatedSummary?: ProtocolAdaptorSummary }> => {
    let dexDataResponse = {} as IHandlerBodyResponse
    try {
        const generatedSummary = await generateProtocolAdaptorSummary(dexData, dataType, adaptorType, undefined, undefined, { isApi2RestServer })

        dexDataResponse = {
            defillamaId: dexData.protocolType === ProtocolType.CHAIN ? `chain#${dexData.defillamaId}` : dexData.defillamaId,
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
            methodology: generatedSummary.methodology,
            allAddresses: generatedSummary.allAddresses,
            latestFetchIsOk: generatedSummary.latestFetchIsOk,
            parentProtocol: generatedSummary.parentProtocol,
            generatedSummary,
            childProtocols: null
        } as IHandlerBodyResponse
    } catch (error) {
        console.error(`Error generating summary for ${dexData.module} ${JSON.stringify(error)}`)
        dexDataResponse = {
            defillamaId: dexData.protocolType === ProtocolType.CHAIN ? `chain#${dexData.defillamaId}` : dexData.defillamaId,
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

const getProtocolSummaryParent = async (parentData: IParentProtocol, dataType: AdaptorRecordType, adaptorType: AdapterType, {
    isApi2RestServer = false
} = {}): Promise<IHandlerBodyResponse> => {
    const adaptorsData = loadAdaptorsData(adaptorType as AdapterType)
    const childs = adaptorsData.default.reduce((acc, curr) => {
        const parentId = curr.parentProtocol
        if (parentId)
            acc[parentId] = acc[parentId] ? [...acc[parentId], curr] : [curr]
        return acc
    }, {} as IJSON<ProtocolAdaptor[]>)[parentData.id]
    const summaries = await Promise.all(childs.map(child => getProtocolSummary(child, dataType, adaptorType, { isApi2RestServer })))
    const totalToday = sumReduce(summaries, 'total24h')
    const totalYesterday = sumReduce(summaries, 'total48hto24h')
    const change_1d = formatNdChangeNumber(totalToday && totalYesterday ? ((totalToday - totalYesterday) / totalYesterday) * 100 : null)
    let totalDataChart = generateAggregatedVolumesChartDataImprov(summaries.map((s) => s.generatedSummary).filter(notUndefined))
    let totalDataChartBreakdown = generateByChainVolumesChartDataBreakdown(summaries.map((s) => s.generatedSummary).filter(notUndefined))
    // This could be avoided/optimized if moved to generateAggregatedVolumesChartData
    totalDataChart = totalDataChart.slice(
        totalDataChart.findIndex(it => it[1] !== 0),
        totalDataChart.length - [...totalDataChart].reverse().findIndex(it => it[1] !== 0)
    )
    // This could be avoided/optimized if moved to generateByDexVolumesChartData
    const sumBreakdownItem = (item: IJSON<IRecordAdapterRecordChainData> | IRecordAdapterRecordChainData): number => Object.values(item).reduce((acc: number, current) => {
        if (typeof current === 'object') return sumBreakdownItem(current)
        return acc += current
    }, 0 as number)
    totalDataChartBreakdown = totalDataChartBreakdown.slice(
        totalDataChartBreakdown.findIndex(it => sumBreakdownItem(it[1]) !== 0),
        totalDataChartBreakdown.length - [...totalDataChartBreakdown].reverse().findIndex(it => sumBreakdownItem(it[1]) !== 0)
    )
    return {
        ...parentData,
        defillamaId: parentData.id,
        displayName: parentData.name,
        total24h: totalToday,
        totalAllTime: summaries.every(c=>c.totalAllTime)? sumReduce(summaries, 'totalAllTime'):null,
        latestFetchIsOk: true,
        disabled: false,
        change_1d,
        methodologyURL: null,
        methodology: null,
        module: null,
        totalDataChart,
        totalDataChartBreakdown,
        childProtocols: summaries.map(s => s.displayName)
    }
}


const sumReduce = (summaries: IJSON<any>[], key: string) => summaries.reduce((acc, curr) => {
    if (curr[key]) return typeof acc === 'number' ? acc += curr[key] : curr[key]
    return acc
}, null as number | null)

const getProtocolData = async (protocolName: string, adaptorType: AdapterType) => {
    // Import data list
    let dexData: ProtocolAdaptor | undefined = undefined
    let adaptorsData: AdaptorData | undefined = undefined
    try {
        adaptorsData = loadAdaptorsData(adaptorType)
        dexData = adaptorsData.default
            .find(va =>
                sluggifyString(va.name) === protocolName
                || sluggifyString(va.displayName) === protocolName
                || va.module === protocolName
            )
    } catch (error) {
        console.error(`Couldn't load adaptors with type ${adaptorType} :${JSON.stringify(error)}`)
    }
    return dexData
}

export default wrap(handler);
