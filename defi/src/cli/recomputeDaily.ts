import { client, TableName, dailyPrefix, getDailyTxs } from "./dynamodb";
import { getProtocol } from "./utils";
import { api } from "@defillama/sdk";
import computeTVL from "../storeTvlInterval/computeTVL";
import { importAdapterDynamic } from "../utils/imports/importAdapter";

async function main() {
  const protocol = getProtocol("Yearn Finance");
  const adapter = await importAdapterDynamic(protocol);
  const PK = `${dailyPrefix}#${protocol.id}`;
  const dailyTxs = await getDailyTxs(protocol.id);
  await Promise.all(
    dailyTxs!.map(async (item) => {
      const { SK } = item;
      console.log(SK, item.tvl);
      const { block } = await api.util.lookupBlock(SK);
      const balances = await adapter.tvl(SK, block);
      const { usdTvl } = await computeTVL(
        balances,
        SK,
        {});
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
