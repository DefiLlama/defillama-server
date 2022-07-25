import { successResponse, wrap, IResponse } from "../../../utils/shared";
import sluggify from "../../../utils/sluggify";
import { getVolume, Volume, VolumeType } from "../../data/volume";
import volumeAdapters from "../../dexAdapters";
import { IRecordVolumeData } from "../storeDexVolume";

export interface VolumeHistoryItem {
    dailyVolume: IRecordVolumeData;
    timestamp: number;
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
        dexDataResponse = {
            ...dexData,
            volumeHistory: volume.map<VolumeHistoryItem>(v => ({
                dailyVolume: v.data,
                timestamp: v.sk
            }))
        }
    } catch (error) {
        console.error(error)
        dexDataResponse = {
            ...dexData,
            volumeHistory: null
        }
    }

    return successResponse(dexDataResponse, 10 * 60); // 10 mins cache
};

export default wrap(handler);