import protocols from "../protocols/data"
import { toUNIXTimestamp } from "../utils/date";
import { dailyTvl } from "../utils/getLastRecord";
import ddb from "../utils/shared/dynamodb"

const monthsStart = 1; // number of months to parse through
const startTimestamp = toUNIXTimestamp(Date.now() - 1e3*3600*24*30*monthsStart);

const main = async () => {
    const changes = (await Promise.all(protocols.map(async protocol=>{
        const dailyValues = await ddb.query({
            ExpressionAttributeValues: {
              ":pk": dailyTvl(protocol.id),
              ":sk": startTimestamp
            },
            KeyConditionExpression: "PK = :pk AND SK > :sk"
          });
        let lastTvl;
        let repeated = 0;
        for(const dailyVal of dailyValues.Items!){
            if(dailyVal.tvl === lastTvl){
                repeated++;
                if(repeated > 3){
                    return [protocol.name, lastTvl] as [string, number]
                }
            } else {
                lastTvl = dailyVal.tvl;
                repeated = 0;
            }
        }
        return null
    }))).filter(p=>p!=null).sort((a,b)=>a![1]-b![1])
    changes.map(c=>console.log(c![1].toFixed(2) + "\t", c![0]))
    console.log("Total:", changes.length)
};
main();
