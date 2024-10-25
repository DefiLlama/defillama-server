import dynamodb from "../utils/shared/dynamodb";
import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl, hourlyTvl, hourlyTokensTvl, hourlyUsdTokensTvl, } from "../utils/getLastRecord";
import { getProtocol } from "./utils";
import { PromisePool } from '@supercharge/promise-pool'
import { Op } from "sequelize";
import { clearProtocolCacheById } from "./utils/clearProtocolCache";
import { deleteProtocolItems, initializeTVLCacheDB, } from "../api2/db";

async function main() {
  const protocolName = process.argv[2]
  const deleteFrom = process.argv[3]
  const deleteTo = process.argv[4]
  console.log('Deteting data for protcol: ', protocolName)
  console.log('From: ', deleteFrom, new Date(+deleteFrom * 1000).toDateString())
  console.log('Till: ', deleteTo, new Date(+deleteTo * 1000).toDateString())
  const protocol: any = getProtocol(protocolName)
  if (!protocol) throw new Error('No protocol with that name')

  await initializeTVLCacheDB()

  for (const tvlFunc of [dailyTokensTvl, dailyTvl, dailyUsdTokensTvl,
    // hourlyTvl, // - we retain hourly in case we want to refill using it for some reason
    // hourlyTokensTvl, hourlyUsdTokensTvl, hourlyTvl
  ]) {
    await deleteProtocolItems(tvlFunc, { id: protocol.id, timestamp: { [Op.lte]: deleteFrom, [Op.gte]: deleteTo } })
    const data = await dynamodb.query({
      ExpressionAttributeValues: {
        ":pk": tvlFunc(protocol.id),
        ":from": +deleteTo,
        ":to": +deleteFrom,
      },
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :from AND :to",
    });
    
    const items = data.Items ?? []
    console.log('have to delete ', items.length, ' items, table:', tvlFunc(protocol.id))

    await PromisePool
      .withConcurrency(42)
      .for(items)
      .process(async (d: any) => {
        await dynamodb.delete({
          Key: {
            PK: d.PK,
            SK: d.SK,
          },
        }); // add code to delete from postgres, dicord bot 
      })

  }
  return clearProtocolCacheById(protocol.id)
}

main().then(() => {
  console.log('Done!!!')
  process.exit(0)
})
