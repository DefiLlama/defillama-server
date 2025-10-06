import { getAllProtocolItems, saveProtocolItem } from "../api2/db";
import { dailyRawTokensTvl, hourlyRawTokensTvl } from "../utils/getLastRecord";
import { prefixMalformed } from "../storeTvlInterval/getAndStoreTvl";
import { PromisePool } from "@supercharge/promise-pool";

const protocols = ["1791", "1972", "529", "5773", "6202"];

async function process(id: string, tvlFunc: Function) {
  const rawTvls = await getAllProtocolItems(tvlFunc, id);
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

  await PromisePool.withConcurrency(5)
    .for(newTvls)
    .process(async (tvl) => {
      await saveProtocolItem(tvlFunc, { id, timestamp: tvl.SK, data: tvl, overwriteExistingData: true })
    })

  return;
}

async function main() {
  await Promise.all(protocols.map(p => process(p, dailyRawTokensTvl)));
  await Promise.all(protocols.map(p => process(p, hourlyRawTokensTvl)));

}

main(); // ts-node defi/src/cli/removeBadTvlKeys.ts
