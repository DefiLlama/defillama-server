import { successResponse, wrap, IResponse } from "../../../utils/shared";
import volumeAdapters, { Dex } from "../../dexAdapters";
import { getVolume, VolumeType } from "../../data/volume"
import allSettled from "promise.allsettled";
import { IRecordVolumeData } from "../storeDexVolume";

interface VolumeSummaryDex extends Dex {
    totalVolume24h: number | null
    volume24hBreakdown: IRecordVolumeData | null
}

export const handler = async (): Promise<IResponse> => {
    const dexsResults = await allSettled(volumeAdapters.map<Promise<VolumeSummaryDex>>(async (adapter) => {
        try {
            const volume = await getVolume(adapter.id, VolumeType.dailyVolume, "LAST")
            // This check is made to infer Volume[] type instead of Volume type
            if (volume instanceof Array) throw new Error("Wrong volume queried")
            return {
                ...adapter,
                totalVolume24h: summAllVolumes(volume.data),
                volume24hBreakdown: volume.data
            }
        } catch (error) {
            console.error(error)
            return {
                ...adapter,
                totalVolume24h: null,
                volume24hBreakdown: null
            }
        }
    }))
    const rejectedDexs = dexsResults.filter(d => d.status === 'rejected').map(fd => fd.status === "rejected" ? fd.reason : undefined)
    rejectedDexs.forEach(console.error)
    const dexs = dexsResults.filter(d => d.status === 'fulfilled').map(fd => fd.status === "fulfilled" ? fd.value : undefined)

    return successResponse({ dexs }, 10 * 60); // 10 mins cache
};

const summAllVolumes = (breakdownVolumes: IRecordVolumeData) =>
    Object.values(breakdownVolumes).reduce((acc, volume) =>
        acc + Object.values(volume)
            .reduce<number>((vacc, current) => typeof current === 'number' ? vacc + current : vacc, 0)
        , 0)

export default wrap(handler);