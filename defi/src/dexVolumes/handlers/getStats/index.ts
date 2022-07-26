import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { successResponse, wrap, IResponse } from "../../../utils/shared";
import sluggify from "../../../utils/sluggify";
import { getVolume, Volume, VolumeType } from "../../data/volume";
import volumeAdapters from "../../dexAdapters";
import { VolumeHistoryItem } from "../getDexVolume";

const monitorDate = new Date();
monitorDate.setFullYear((new Date()).getFullYear() - 1)
const DAY_IN_MILISECONDS = 86400000

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const dexName = event.pathParameters?.dex?.toLowerCase()
    if (!dexName) throw new Error("Missing DEX name!")

    const dexData = volumeAdapters.find(
        (prot) => sluggify(prot) === dexName
    );
    if (!dexData) throw new Error("DEX data not found!")
    let volumeHistory: VolumeHistoryItem[] = []
    try {
        const volume = await getVolume(dexData.id, VolumeType.dailyVolume, "ALL")
        // This check is made to infer Volume type instead of Volume[] type
        if (volume instanceof Volume) throw new Error("Wrong volume queried")
        volumeHistory = volume.map(v => ({
            dailyVolume: v.data,
            timestamp: v.sk
        }))
    } catch (error) {
        console.error(error)
        volumeHistory = []
    }

    const response = getDataPoints().map((date) => {
        const itemDate = volumeHistory.find(vh => getTimestampAtStartOfDayUTC(vh.timestamp) === date)
        const itemWithError = itemDate ? Object.values(itemDate?.dailyVolume).find(
            chainObj => Object.keys(chainObj).includes("error")
        ) : undefined
        return {
            timestamp: date,
            recorded: !!itemDate && !itemWithError,
            error: itemWithError ? Object.values(itemWithError).map(value => JSON.stringify(value)).join("") : null,
        }
    })

    return successResponse(response, 10 * 60); // 10 mins cache
};

function getDataPoints() {
    const dataPoints = []
    for (let day = 1; day <= 365; day++) {
        const currTimestamp = new Date((monitorDate.getTime() + DAY_IN_MILISECONDS * day) / 1000)
        const start = getTimestampAtStartOfDayUTC(currTimestamp.getTime())
        dataPoints.push(start)
    }
    return dataPoints
}

export default wrap(handler);