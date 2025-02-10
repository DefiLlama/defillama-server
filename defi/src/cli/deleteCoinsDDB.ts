process.env.tableName = "prod-coins-table";

require("dotenv").config();

import dynamodb from "../utils/shared/dynamodb";
import { PromisePool } from '@supercharge/promise-pool'

const coins = [
  'asset#ton:eqaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaam9c',
  'asset#ton:eqcxe6mutqjkfngfarotkot1lzbdiix1kcixrv7nw2id_sds',
]

async function main() {
  for (const id of coins) {
    const data = await dynamodb.query({
      ExpressionAttributeValues: {
        ":pk": id,
      },
      KeyConditionExpression: "PK = :pk",
    });
    const items = data.Items ?? []
    console.log('have to delete ', items.length, ' items, table:', id)
    await PromisePool
      .withConcurrency(42)
      .for(items)
      .process(async (d: any) => {
        if (!d.redirect) return;
        const isTonRedirect = d.redirect.startsWith('asset#ton:')
        if (!isTonRedirect) {
          console.log('Deleting item: ', d.PK, d.SK, d.redirect)
          await dynamodb.delete({
            Key: {
              PK: d.PK,
              SK: d.SK,
            },
          });
          return;
        } else if (d.SK === 0 && d.confidence > 0.9) {
          console.log('changing item: ', d.PK, d.SK, d.redirect, d.confidence)
          await dynamodb.update({
            Key: {
              PK: d.PK,
              SK: d.SK,
            },
            UpdateExpression: 'SET confidence = :confidence',
            ExpressionAttributeValues: {
              ':confidence': 0.9,
            },
          })
        } else {
        }
      })

  }
}

main().then(() => {
  console.log('Done!!!')
  process.exit(0)
})
