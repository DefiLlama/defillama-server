import allSettled from "promise.allsettled";
import { successResponse, wrap, IResponse } from "../../../utils/shared";
import sluggify from "../../../utils/sluggify";
import { getVolume, Volume, VolumeType } from "../../data/volume";
import volumeAdapters from "../../dexAdapters";

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const dexName = event.pathParameters?.dex?.toLowerCase()
    if (!dexName) throw new Error("Missing DEX name!")

    const dexData = volumeAdapters.find(
        (prot) => sluggify(prot) === dexName
    );
    if (!dexData) throw new Error("DEX data not found!")

    const dexsResults = await allSettled(volumeAdapters.map(async (adapter) => {
        try {
            const volume = await getVolume(adapter.id, VolumeType.dailyVolume, "ALL")
            // This check is made to infer Volume type instead of Volume[] type
            if (volume instanceof Volume) throw new Error("Wrong volume queried")
            return {
                ...adapter,
                volumeHistory: volume.map(v => ({
                    dailyVolume: v.data,
                    timestamp: v.sk
                }))
            }
        } catch (error) {
            return {
                ...adapter,
                volumeHistory: null
            }
        }
    }))
    const rejectedDexs = dexsResults.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)
    const dexs = dexsResults.filter(d => d.status === 'fulfilled').map(fd => fd.status === "fulfilled" ? fd.value : undefined)
    console.log(dexs);

    return successResponse({ dexs }, 10 * 60); // 10 mins cache
};

export default wrap(handler);