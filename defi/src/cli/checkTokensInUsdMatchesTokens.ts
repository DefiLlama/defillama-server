import protocols from "../protocols/data";
import dynamodb from "../utils/shared/dynamodb";
import { dailyTvl, dailyTokensTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";

async function main() {
    await Promise.all(
      protocols.map(async (protocol) => {
        const [tokens, usd] = await Promise.all([dailyTokensTvl, dailyUsdTokensTvl].map(tvlPrefix=>
        dynamodb.query({
          ExpressionAttributeValues: {
            ":pk": tvlPrefix(protocol.id),
          },
          KeyConditionExpression: "PK = :pk",
        }).then(r=>r.Items ?? [])))
        for(const t of tokens.concat(usd)){
            if(t.tvl === undefined){
                console.log("corrupted", protocol.name)
            }
        }
        if(tokens.length !== usd.length){
            console.log("unmatched lengths", protocol.name, tokens.length, usd.length)
            return
        }
        for(let i=0;i<Math.max(tokens.length, usd.length); i++){
          if(tokens[i]?.SK !== usd[i]?.SK){
              console.log(`different dates on protocol ${protocol.name} at date ${tokens[i]?.SK}`)
              if(Object.keys(tokens[i].tvl).length < 10){
                  for(let j=-1; j<2; j++){
                    console.log(tokens[i+j], usd[i+j])
                  }
              }
              return
          }
        }
      })
    )
}
main()