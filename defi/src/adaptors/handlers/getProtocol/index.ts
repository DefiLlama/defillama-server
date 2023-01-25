import { successResponse, wrap, IResponse, notFoundResponse } from "../../../utils/shared";
import sluggify, { sluggifyString } from "../../../utils/sluggify";
import { getAdaptorRecord, AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap } from "../../db-utils/adaptor-record";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import loadAdaptorsData from "../../data"
import { IJSON, ProtocolAdaptor } from "../../data/types";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import generateProtocolAdaptorSummary from "../helpers/generateProtocolAdaptorSummary";
import { IChartData, IChartDataBreakdown, sumAllVolumes } from "../../utils/volumeCalcs";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../getOverview";

export interface ChartItem {
    data: IRecordAdaptorRecordData;
    timestamp: number;
}

export interface IHandlerBodyResponse extends Pick<ProtocolAdaptor,
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
    | "protocolsData"
    | "chains"
    | "methodologyURL"
    | 'allAddresses'
> {
    totalDataChart: IChartData | null
    totalDataChartBreakdown: IChartDataBreakdown | null
    total24h: number | null
    change_1d: number | null
    totalAllTime: number | null
    latestFetchIsOk: boolean
}

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const protocolName = event.pathParameters?.name?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const rawDataType = event.queryStringParameters?.dataType
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    if (!protocolName || !adaptorType) throw new Error("Missing name or type")


    // Import data list
    const adapters2load: string[] = [adaptorType, "protocols"]
    const protocolsList = Object.keys(loadAdaptorsData(adaptorType).config)
    let dexData: ProtocolAdaptor | undefined = undefined
    for (const type2load of adapters2load) {
        try {
            const adaptorsData = loadAdaptorsData(type2load as AdapterType)
            dexData = adaptorsData.default
                .find(va => protocolsList.includes(va.module)
                    && (sluggify(va) === protocolName || sluggifyString(va.displayName) === protocolName)
                )
            if (dexData) break
        } catch (error) {
            console.error(`Couldn't load adaptors with type ${type2load} :${JSON.stringify(error)}`)
        }
    }

    if (!dexData) return notFoundResponse({
        message: `${adaptorType[0].toUpperCase()}${adaptorType.slice(1)} for ${protocolName} not found, please visit /overview/${adaptorType} to see available protocols`
    }, 10 * 60)
    let dexDataResponse = {}
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
            totalAllTime: generatedSummary.totalAllTime,
            change_1d: generatedSummary.change_1d,
            module: dexData.module,
            protocolType: generatedSummary.protocolType,
            protocolsData: dexData.protocolsData && Object.keys(dexData.protocolsData).length > 1 ? dexData.protocolsData : null,
            chains: generatedSummary.chains,
            methodologyURL: generatedSummary.methodologyURL,
            allAddresses: generatedSummary.allAddresses,
            latestFetchIsOk: generatedSummary.latestFetchIsOk
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
            protocolsData: dexData.protocolsData,
            latestFetchIsOk: false,
            chains: dexData.chains,
            totalDataChart: null,
            totalDataChartBreakdown: null,
            total24h: null,
            totalAllTime: null,
            change_1d: null,
        } as IHandlerBodyResponse
    }

    return successResponse(dexDataResponse as IHandlerBodyResponse, 10 * 60); // 10 mins cache
};

const formatChartHistory = (volumes: AdaptorRecord[] | null) => {
    if (volumes === null) return []
    return volumes.map<ChartItem>(v => ({
        data: v.data,
        timestamp: v.sk
    }))
}

export default wrap(handler);