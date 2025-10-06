import { getAllProtocolItems, saveProtocolItem } from "../api2/db";
import { dailyRawTokensTvl } from "../utils/getLastRecord";
import { prefixMalformed } from "../storeTvlInterval/getAndStoreTvl";
import { PromisePool } from "@supercharge/promise-pool";

const protocols = ["1791", "1972", "529", "5773", "6202"];

async function process(id: string) {
  const rawTvls = await getAllProtocolItems(dailyRawTokensTvl, id);
  const newTvls: any[] = [];
  rawTvls.map((rawTvl: any) => {
    const newTvl: any = { SK: rawTvl.SK };

    Object.keys(rawTvl).map((chain) => {
      if (chain == "SK") return;
      newTvl[chain] = {};
      
      Object.keys(rawTvl[chain]).map((token) => {
        if (!prefixMalformed(token)) newTvl[chain][token] = rawTvl[chain][token];
        else console.log(id, rawTvl.SK, chain, token);
      });
    });

    newTvls.push(newTvl);
  });

  await PromisePool.withConcurrency(20)
    .for(newTvls)
    .process(async (tvl) => {
      await saveProtocolItem(dailyRawTokensTvl, { id, timestamp: tvl.SK, data: tvl, })
    })

  return;
}

async function main() {
  await Promise.all(protocols.map(process));
}

main(); // ts-node defi/src/cli/removeBadTvlKeys.ts
