import { dailyTvl, getLastRecord } from "../utils/getLastRecord";
import dynamodb from "../utils/shared/dynamodb";
import protocols from "../protocols/data";
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay } from "../utils/date";

async function main() {
    await Promise.all(protocols.map(async protocol => {
        const last = await getLastRecord(dailyTvl(protocol.id))
        if(last && last.SK === getTimestampAtStartOfDay(getCurrentUnixTimestamp())){
            console.log(`Deleting TVL for protocol ${protocol.name} at time ${new Date(last!.SK * 1e3)}`)
            /*
            await dynamodb.delete({
                Key: {
                    PK: last!.PK,
                    SK: last!.SK
                }
            })
            */
        }
    }))
    process.exit(0)
}
main()