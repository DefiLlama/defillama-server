import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { successResponse, wrap, IResponse } from "../../../utils/shared";
import sluggify from "../../../utils/sluggify";
import { getVolume, Volume, VolumeType } from "../../data/volume";
import volumeAdapters, { Dex } from "../../dexAdapters";
import { summAllVolumes } from "../../utils/volumeCalcs";
import { IRecordVolumeData } from "../storeDexVolume";

export interface VolumeHistoryItem {
    dailyVolume: IRecordVolumeData;
    timestamp: number;
}

export interface IHandlerBodyResponse extends Dex {
    volumeHistory: VolumeHistoryItem[] | null
    total1dVolume: number | null
}

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const dexName = event.pathParameters?.dex?.toLowerCase()
    if (!dexName) throw new Error("Missing DEX name!")

    const dexData = volumeAdapters.find(
        (prot) => sluggify(prot) === dexName
    );
    if (!dexData) throw new Error("DEX data not found!")
    let dexDataResponse = {}
    try {
        const volume = await getVolume(dexData.id, VolumeType.dailyVolume, "ALL")
        // This check is made to infer Volume type instead of Volume[] type
        if (volume instanceof Volume) throw new Error("Wrong volume queried")

        const todaysTimestamp = getTimestampAtStartOfDayUTC((Date.now() - 1000 * 60 * 60 * 24) / 1000);
        const todaysVolume = volume.find(v => getTimestampAtStartOfDayUTC(v.timestamp) === todaysTimestamp)?.data

        const ddr: IHandlerBodyResponse = {
            ...dexData,
            volumeHistory: volume.map<VolumeHistoryItem>(v => ({
                dailyVolume: v.data,
                timestamp: v.sk
            })),
            total1dVolume: todaysVolume ? summAllVolumes(todaysVolume) : 0
        }
        dexDataResponse = ddr
    } catch (error) {
        console.error(error)
        const ddr: IHandlerBodyResponse = {
            ...dexData,
            volumeHistory: null,
            total1dVolume: null,
        }
        dexDataResponse = ddr
    }

    return successResponse(dexDataResponse as IHandlerBodyResponse, 10 * 60); // 10 mins cache
};

export default wrap(handler);