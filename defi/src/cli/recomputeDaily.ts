import { client, TableName, dailyPrefix, getDailyTxs } from "./dynamodb";
import { getProtocol } from "./utils";
import { util, api } from "@defillama/sdk";
import {
  releaseCoingeckoLock,
  getCoingeckoLock,
} from "../utils/shared/coingeckoLocks";
import { importAdapter } from "../utils/importAdapter";

async function main() {
  const protocol = getProtocol("Yearn Finance");
  const adapter = await importAdapter(protocol);
  const PK = `${dailyPrefix}#${protocol.id}`;
  const dailyTxs = await getDailyTxs(protocol.id);
  setInterval(() => {
    releaseCoingeckoLock();
  }, 1e3);
  await Promise.all(
    dailyTxs!.map(async (item) => {
      const { SK } = item;
      console.log(SK, item.tvl);
      const { block } = await api.util.lookupBlock(SK);
      const balances = await adapter.tvl(SK, block);
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
