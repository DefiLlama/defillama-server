const protocolName = ""

import dynamodb from "../utils/dynamodb";
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
      if (d.SK < 1619388000) {
        await dynamodb.delete({
          Key: {
            PK: d.PK,
            SK: d.SK,
          },
        });
      }
    }
  }
}
main();
