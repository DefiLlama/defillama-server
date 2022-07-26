import { PromiseResult } from "aws-sdk/lib/request";
import { ScanOutput } from "aws-sdk/clients/dynamodb";
import { AWSError } from "aws-sdk";
import getTokenPrices from "../adapters/yield/yearn/yearnV2";
import dynamodb, { batchWrite } from "../utils/shared/dynamodb";
async function main() {
  await getTokenPrices("ethereum", 1658357999);
  // "bsc",
  // "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
  // "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2"
}
main();
async function hi() {
  let results: any[] = [];
  let data: PromiseResult<ScanOutput, AWSError> = await dynamodb.scan({
    FilterExpression:
      "(SK > :sk) OR (begins_with(PK,:pk) AND attribute_not_exists(price))",
    ExpressionAttributeValues: {
      ":sk": 1858760357,
      ":pk": "coingecko#"
    },
    ProjectionExpression: "PK, SK"
  });
  while ("LastEvaluatedKey" in data) {
    data = await dynamodb.scan({
      FilterExpression:
        "(SK > :sk) OR (begins_with(PK,:pk) AND attribute_not_exists(price))",
      ExpressionAttributeValues: {
        ":sk": 1858760357,
        ":pk": "coingecko#"
      },
      ProjectionExpression: "PK, SK",
      ExclusiveStartKey: data.LastEvaluatedKey
    });
    if (data.Items != undefined && data.Items.length > 0) {
      results.push(...data.Items);
    }
  }

  let a = await Promise.all(
    results.map((r: any) =>
      dynamodb.delete({
        Key: { PK: r.PK, SK: r.SK }
      })
    )
  );
  console.log("a");
  // const a = await Promise.all(data.map((d: any) => dynamodb.delete({
  //   PK: d.PK,
  //   SK: d.SK
  // }))
  // const data = await dynamodb.query({
  //   ExpressionAttributeValues: {
  //     ":sk": 1858760357,
  //     ":pk": "asset"
  //   },
  //   KeyConditionExpression: "PK BEGINS_WITH :pk SK GT :sk"
  // });
  // for (const d of data.Items ?? []) {
  //   if (d.tvl === undefined) {
  //     await dynamodb.delete({
  //       Key: {
  //         PK: d.PK,
  //         SK: d.SK
  //       }
  //     });
  //   }
  // }
}
//hi();
// ts-node coins/src/cli/test.ts
