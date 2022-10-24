import { successResponse, wrap, IResponse } from "../../../utils/shared";
import sluggify, { sluggifyString } from "../../../utils/sluggify";
import { getAdaptorRecord, AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap } from "../../db-utils/adaptor-record";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import loadAdaptorsData from "../../data"
import { IJSON, ProtocolAdaptor } from "../../data/types";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import generateProtocolAdaptorSummary from "../helpers/generateProtocolAdaptorSummary";
import { IChartData, IChartDataBreakdown, sumAllVolumes } from "../../utils/volumeCalcs";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../getOverview";

export interface ChartItem {
    data: IRecordAdaptorRecordData;
    timestamp: number;
}

export interface IHandlerBodyResponse extends Pick<ProtocolAdaptor,
    "name"
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
> {
    totalDataChart: IChartData | null
    totalDataChartBreakdown: IChartDataBreakdown | null
    total24h: number | null
    change_1d: number | null
    totalAllTime: number | null
}

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const protocolName = event.pathParameters?.name?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const rawDataType = event.queryStringParameters?.dataType
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    if (!protocolName || !adaptorType) throw new Error("Missing name or type")

    const adaptorsData = loadAdaptorsData(adaptorType)
    console.log(Object.keys(adaptorsData.default))
    const dexData = adaptorsData.default.find(
        (prot) => sluggify(prot) === protocolName || sluggifyString(prot.displayName) === protocolName
    );
    if (!dexData) throw new Error("DEX data not found!")
    let dexDataResponse = {}
    try {
        const generatedSummary = await generateProtocolAdaptorSummary(dexData, dataType)

        dexDataResponse = {
            name: generatedSummary.name,
            disabled: generatedSummary.disabled,
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
            totalDataChart: generatedSummary.records?.map(record => ([record.timestamp, sumAllVolumes(record.data)])) ?? null,
            totalDataChartBreakdown: generatedSummary.records?.map(record => ([record.timestamp, record.data])) ?? null,
            total24h: generatedSummary.total24h,
            totalAllTime: generatedSummary.totalAllTime,
            change_1d: generatedSummary.change_1d,
            module: dexData.module,
            protocolType: generatedSummary.protocolType,
            protocolsData: dexData.protocolsData,
            chains: generatedSummary.chains
        } as IHandlerBodyResponse
    } catch (error) {
        console.error(error)
        dexDataResponse = {
            name: dexData.name,
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