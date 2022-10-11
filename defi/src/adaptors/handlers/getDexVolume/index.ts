import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { successResponse, wrap, IResponse } from "../../../utils/shared";
import sluggify from "../../../utils/sluggify";
import { getAdaptorRecord, AdaptorRecord, AdaptorRecordType } from "../../db-utils/adaptor-record";
import { isDisabled } from "../../utils/getAllChainsFromAdaptors";
import removeErrors from "../../utils/removeErrors";
import { calcNdChange, sumAllVolumes } from "../../utils/volumeCalcs";
import { IRecordAdaptorRecordData } from "../../db-utils/adaptor-record";
import loadAdaptorsData from "../../data"
import { IJSON, ProtocolAdaptor } from "../../data/types";
import { AdapterType } from "@defillama/adaptors/adapters/types";

export interface VolumeHistoryItem {
    dailyVolume: IRecordAdaptorRecordData;
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
> {
    volumeHistory: VolumeHistoryItem[] | null
    total1dVolume: number | null
    change1dVolume: number | null
}

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24

const DEFAULT_CHART_BY_ADAPTOR_TYPE: IJSON<string> = {
    [AdapterType.VOLUME]: AdaptorRecordType.dailyVolumeRecord,
    [AdapterType.FEES]: AdaptorRecordType.dailyFeesRecord
}

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const dexName = event.pathParameters?.dex?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase()
    const errors = event.queryStringParameters?.errors?.toLowerCase() === 'true'
    if (!dexName || !adaptorType) throw new Error("Missing DEX name!")

    const adaptorsData = (await loadAdaptorsData(adaptorType as AdapterType))
    const dexData = adaptorsData.default.find(
        (prot) => sluggify(prot) === dexName
    );
    if (!dexData) throw new Error("DEX data not found!")
    let dexDataResponse = {}
    try {
        const volumes = await getAdaptorRecord(dexData.id, DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType] as AdaptorRecordType, "ALL")
        // This check is made to infer Volume type instead of Volume[] type
        if (volumes instanceof AdaptorRecord) throw new Error("Wrong volume queried")

        const yesterdaysVolumeObj = volumes[volumes.length - 1]
        //const yesterdaysTimestamp = (Date.now() / 1000) - ONE_DAY_IN_SECONDS;
        const yesterdaysVolume = yesterdaysVolumeObj.data // volumes.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === getTimestampAtStartOfDayUTC(yesterdaysTimestamp))?.data
        const ddr: IHandlerBodyResponse = {
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
            volumeHistory: volumes.map<VolumeHistoryItem>(v => ({
                dailyVolume: errors
                    ? v.data
                    : removeErrors(v.data),
                timestamp: v.sk
            })),
            total1dVolume: yesterdaysVolume ? sumAllVolumes(yesterdaysVolume) : 0,
            change1dVolume: calcNdChange(volumes, 1, yesterdaysVolumeObj.timestamp)
        }
        dexDataResponse = ddr
    } catch (error) {
        console.error(error)
        const ddr: IHandlerBodyResponse = {
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
            volumeHistory: null,
            total1dVolume: null,
            change1dVolume: null
        }
        dexDataResponse = ddr
    }

    return successResponse(dexDataResponse as IHandlerBodyResponse, 10 * 60); // 10 mins cache
};

export default wrap(handler);