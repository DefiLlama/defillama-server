import { storeR2JSONString } from "./utils/r2";
import { batchGet } from "./utils/shared/dynamodb";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import fetch from "node-fetch";

async function buildCGCoinsList(){
  const list = (await fetch(`https://api.coingecko.com/api/v3/coins/list?include_platform=true`).then(r=>r.json())) as any[]
  const coins = await batchGet(list.map((coin: any) => ({
    PK: `coingecko#${coin.id}`,
    SK: 0,
  })));
  const idToMcap = {} as any;
  coins.forEach(coin=>{
    idToMcap[coin.PK] = coin.mcap;
  })
  return list.map(c=>({...c, mcap: idToMcap[`coingecko#${c.id}`]}))
}

const handler = async () => {
  const list = await buildCGCoinsList();
  await storeR2JSONString(`tokenlist/cgFull.json`, JSON.stringify(list), 60 * 60);
};

export default wrapScheduledLambda(handler);
