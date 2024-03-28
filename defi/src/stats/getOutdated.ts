import { successResponse, wrap, IResponse } from "../utils/shared";
import protocols from "../protocols/data";
import { getLastRecord, hourlyTvl } from "../utils/getLastRecord";
import { getCurrentUnixTimestamp } from "../utils/date";
import { importAdapter } from "../utils/imports/importAdapter";

const maxDrift = (60 + 20) * 60;
const maxOutdated = 5;

let _getLastHourlyRecord = (protocol: any) => getLastRecord(hourlyTvl(protocol.id))

export async function getOutdated(getLastHourlyRecord = _getLastHourlyRecord) {
    const now = getCurrentUnixTimestamp();
    const outdated = [] as [string, number, boolean][];
    const outdatedByLength = {} as {[lengthOutdated:number]:number}
    for(let i = 1; i<=maxOutdated; i++){
        outdatedByLength[i]=0;
    }

    await Promise.all(protocols.map(async protocol => {
        const item = await getLastHourlyRecord(protocol);
        if (item !== undefined && item.SK < (now - maxDrift)) {
            const module = importAdapter(protocol)
            const refillable = !(module.fetch || module.timetravel === false)
            outdated.push([protocol.name, now - item.SK, refillable])
            const timeOutdated = Math.min(Math.round((now - item.SK)/3600), maxOutdated)
            outdatedByLength[timeOutdated] += 1;
        }
    }))
    const totalProtocols = protocols.length;
    const percentOutdated = (outdated.length/totalProtocols)*100
    return {
        outdated,
        totalProtocols,
        percentOutdated,
        outdatedByLength,
        outdatedByLengthArray: Object.entries(outdatedByLength),
        outdatedByLengthPercent: Object.fromEntries(Object.entries(outdatedByLength).map(([l, o])=>[l, o/totalProtocols]))
    }
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    return successResponse(await getOutdated()); // 10 mins cache
};

export default wrap(handler);