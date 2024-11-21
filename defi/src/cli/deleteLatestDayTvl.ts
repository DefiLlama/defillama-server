import { dailyTvl, getLastRecord } from "../utils/getLastRecord";
import dynamodb from "../utils/shared/dynamodb";
import { getProtocol } from "./utils";

async function main(){
    const protocol = getProtocol(process.argv[2])
    const last = await getLastRecord(dailyTvl(protocol.id))
    console.log(`Deleting TVL for protocol ${protocol.name} at time ${new Date(last!.SK*1e3)}`)
    await dynamodb.delete({
        Key:{
            PK:last!.PK,
            SK: last!.SK
        }
    })
}
main()