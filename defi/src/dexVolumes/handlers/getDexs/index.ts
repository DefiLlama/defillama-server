import { successResponse, wrap, IResponse } from "../../../utils/shared";
import volumeAdapters from "../../dexAdapters";
import { getVolume, VolumeType } from "../../data/volume"
import allSettled from "promise.allsettled";

export const handler = async (): Promise<IResponse> => {
    const dexsResults = await allSettled(volumeAdapters.map(async (adapter) => {
        try {
            const volume = await getVolume(adapter.id, VolumeType.dailyVolume, "LAST")
            // This check is made to infer Volume type instead of Volume[] type
            if (volume instanceof Array) throw new Error("Wrong volume queried")
            return {
                ...adapter,
                last24hVolume: volume.data
            }
        } catch (error) {
            return {
                ...adapter,
                last24hVolume: null
            }
        }
    }))
    const rejectedDexs = dexsResults.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)
    const dexs = dexsResults.filter(d => d.status === 'fulfilled').map(fd => fd.status === "fulfilled" ? fd.value : undefined)

    return successResponse({ dexs }, 10 * 60); // 10 mins cache
};

export default wrap(handler);