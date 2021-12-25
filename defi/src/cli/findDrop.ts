import protocols from "../protocols/data";
import dynamodb from "../utils/dynamodb";
import { dailyTvl, dailyTokensTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import {date} from './utils'

const drop = 0.25

async function main() {
  console.log("Protocol, Timestamp, Date, Yesterday's TVL, Today's TVL")
  for (const tvlPrefix of [dailyTvl]) {
    await Promise.all(
      protocols.map(async (protocol) => {
        const historicalTvl = (await dynamodb.query({
          ExpressionAttributeValues: {
            ":pk": tvlPrefix(protocol.id),
          },
          KeyConditionExpression: "PK = :pk",
        })).Items ?? []
        for(let i=1;i<historicalTvl.length; i++){
          if(historicalTvl[i].tvl<(historicalTvl[i-1].tvl*(1-drop))){
            console.log([protocol.name, historicalTvl[i].SK, date(historicalTvl[i].SK), historicalTvl[i-1].tvl, historicalTvl[i].tvl].join(','))
          }
        }
      })
    )
  }
}
main()