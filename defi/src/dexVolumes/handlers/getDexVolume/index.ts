import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { successResponse, wrap, IResponse } from "../../../utils/shared";
import sluggify from "../../../utils/sluggify";
import { getVolume, Volume, VolumeType } from "../../data/volume";
import volumeAdapters, { Dex } from "../../dexAdapters";
import { calcNdChange, sumAllVolumes } from "../../utils/volumeCalcs";
import { IRecordVolumeData } from "../storeDexVolume";

export interface VolumeHistoryItem {
    dailyVolume: IRecordVolumeData;
    timestamp: number;
}

export interface IHandlerBodyResponse extends Pick<Dex,
    "name"
    | "logo"
    | "address"
    | "url"
    | "description"
    | "audits"
    | "category"
    | "twitter"
    | "audit_links"
    | "volumeAdapter"
    | "forkedFrom"
    | "gecko_id"
> {
    volumeHistory: VolumeHistoryItem[] | null
    total1dVolume: number | null
    change1dVolume: number | null
}

export const ONE_DAY_IN_SECONDS = 60 * 60 * 24

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const dexName = event.pathParameters?.dex?.toLowerCase()
    const errors = event.queryStringParameters?.errors?.toLowerCase() === 'true'
    if (!dexName) throw new Error("Missing DEX name!")

    const dexData = volumeAdapters.find(
        (prot) => sluggify(prot) === dexName
    );
    if (!dexData) throw new Error("DEX data not found!")
    let dexDataResponse = {}
    try {
        const volumes = await getVolume(dexData.id, VolumeType.dailyVolume, "ALL")
        // This check is made to infer Volume type instead of Volume[] type
        if (volumes instanceof Volume) throw new Error("Wrong volume queried")

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
            volumeAdapter: dexData.volumeAdapter,
            forkedFrom: dexData.forkedFrom,
            gecko_id: dexData.gecko_id,
            volumeHistory: volumes.map<VolumeHistoryItem>(v => ({
                dailyVolume: errors
                    ? v.data
                    : Object.entries(v.data).reduce((acc, [chain, volume]) => {
                        const entries = Object.entries(volume)
                        if (entries.length === 1 && entries[0][0] === 'error' || chain === 'eventTimestamp') return acc
                        acc[chain] = entries.reduce((pacc, [prot, value]) => {
                            if (prot !== 'error' && typeof value === 'number')
                                pacc[prot] = value
                            return pacc
                        }, {} as {
                            [protocolVersion: string]: number,
                        })
                        return acc
                    }, {} as IRecordVolumeData),
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
            volumeAdapter: dexData.volumeAdapter,
            forkedFrom: dexData.forkedFrom,
            gecko_id: dexData.gecko_id,
            volumeHistory: null,
            total1dVolume: null,
            change1dVolume: null
        }
        dexDataResponse = ddr
    }

    return successResponse(dexDataResponse as IHandlerBodyResponse, 10 * 60); // 10 mins cache
};

export default wrap(handler);