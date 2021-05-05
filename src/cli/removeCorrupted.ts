import dynamodb from "../utils/dynamodb";
import { dailyTokensTvl } from "../utils/getLastRecord";
import protocols from "../protocols/data";

async function main(){
    for(const protocol of protocols){
        const data = await dynamodb.query({
            ExpressionAttributeValues: {
              ":pk": dailyTokensTvl(protocol.id),
            },
            KeyConditionExpression: "PK = :pk",
          });
        for(const d of (data.Items ?? [])){
            if(d.tvl === undefined){
                await dynamodb.delete({
                    Key:{
                        PK: d.PK,
                        SK: d.SK
                    }
                })
                console.log(protocol.name)
            }
        }
    }
}
main()