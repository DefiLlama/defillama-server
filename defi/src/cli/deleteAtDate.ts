import dynamodb from "../utils/shared/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, hourlyTvl } from "../utils/getLastRecord";
import { getProtocol } from "./utils";

async function main() {
  const protocol = getProtocol('Forteswap')
  const deleteFrom = (+new Date('2022-08-21')) / 1000
  for (const tvlFunc of [dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, hourlyTvl]) {
    const data = await dynamodb.query({
      ExpressionAttributeValues: {
        ":pk": tvlFunc(protocol.id),
      },
      KeyConditionExpression: "PK = :pk",
    });
    const items = (data.Items ?? []).filter(d => d.SK < deleteFrom)
    console.log('have to delete ', items.length, ' items, table:', tvlFunc(protocol.id))
    for (const d of items) {
      await dynamodb.delete({
        Key: {
          PK: d.PK,
          SK: d.SK,
        },
      });
    }
  }
}
main();
