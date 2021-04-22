import { client, TableName, dailyPrefix } from "./dynamodb";
import { getProtocol } from "./utils";
import { util, api } from "@defillama/sdk";
import {
  releaseCoingeckoLock,
  getCoingeckoLock,
} from "../storeTvlInterval/coingeckoLocks";

async function main() {
  const protocol = getProtocol("Yearn Finance");
  const adapter = await import(
    `../../DefiLlama-Adapters/projects/${protocol.module}`
  );
  const PK = `${dailyPrefix}#${protocol.id}`;
  const dailyTxs = await client
    .query({
      TableName,
      ExpressionAttributeValues: {
        ":pk": PK,
      },
      KeyConditionExpression: "PK = :pk",
    })
    .promise();
  setInterval(() => {
    releaseCoingeckoLock();
  }, 1e3);
  await Promise.all(
    dailyTxs.Items!.map(async (item) => {
      const { SK } = item;
      console.log(SK, item.tvl);
      const { block } = await api.util.lookupBlock(SK);
      const balances = await adapter.tvl(SK, block);
      console.log(balances);
      const { usdTvl } = await util.computeTVL(
        balances,
        SK,
        true,
        undefined,
        getCoingeckoLock,
        3
      );
      console.log("new tvl", SK, usdTvl);
      await client
        .update({
          TableName,
          Key: {
            PK,
            SK,
          },
          UpdateExpression: "set tvl = :tvl",
          ExpressionAttributeValues: {
            ":tvl": usdTvl,
          },
        })
        .promise();
    })
  );
  process.exit();
}

main();
