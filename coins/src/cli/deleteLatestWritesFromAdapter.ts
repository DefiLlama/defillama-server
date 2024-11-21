import { stargate } from "../adapters/markets/stargate";
import { getCurrentUnixTimestamp } from "../utils/date";
import ddb from "../utils/shared/dynamodb";

const secondsToDelete = 4*3600;

async function main(){
    const writes = await stargate()
    const start = getCurrentUnixTimestamp() - secondsToDelete
    await Promise.all(writes.flat().map(async coin=>{
        const records = (await ddb.query({
            ExpressionAttributeValues: {
                ":pk": coin.PK,
                ":sk": start
            },
            KeyConditionExpression: "PK = :pk AND SK > :sk",
        })).Items
        if(records === undefined){
            return
        }
        await Promise.all(records.map(r=>ddb.delete({
            Key:{
                PK: r.PK,
                SK: r.SK
            }
        })))
    }))
}
main()