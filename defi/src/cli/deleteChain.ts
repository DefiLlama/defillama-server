const protocolName = "sushiswap"
const chainToDelete = "okexchain"

import dynamodb from "../utils/shared/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";

async function main() {
  const protocol = getProtocol(protocolName)
  for(const tvlFunc of [dailyTokensTvl, dailyTvl, dailyUsdTokensTvl]){
    const data = await dynamodb.query({
      ExpressionAttributeValues: {
        ":pk": tvlFunc(protocol.id),
      },
      KeyConditionExpression: "PK = :pk",
    });
    for (const d of data.Items ?? []) {
        const chainData = d[chainToDelete]
        if(chainData === undefined){
            continue
        }
        delete d[chainToDelete];
        if(tvlFunc === dailyTvl){
            d.tvl -= chainData
        } else {
            Object.entries(chainData).forEach(tokenData=>{
                d.tvl[tokenData[0]] -= tokenData[1] as number
            })
        }
        await dynamodb.put(d);
    }
  }
}
main();
