import protocols from "./protocols/data";
import dynamodb from "./utils/dynamodb";
import { getLastRecord, hourlyTvl } from './utils/getLastRecord'
import { getClosestDayStartTimestamp } from "./utils/date";
import { getChainDisplayName, chainCoingeckoIds, transformNewChainName } from "./utils/normalizeChain";
import { wrapScheduledLambda } from "./utils/wrap";
import { store } from "./utils/s3";
import { constants, brotliCompress } from 'zlib'
import { promisify } from 'util'
import { secondsInHour } from './utils/date'

function sum(sumDailyTvls:SumDailyTvls, chain:string, timestamp: number, itemTvl:number){
  if(sumDailyTvls[chain] === undefined){
    sumDailyTvls[chain] = {}
  }
  if (typeof itemTvl === 'number' && !Number.isNaN(itemTvl)) {
    sumDailyTvls[chain][timestamp] = itemTvl + (sumDailyTvls[chain][timestamp] ?? 0);
  } else {
    console.log("itemTvl is NaN", itemTvl, chain, timestamp)
  }
}

interface SumDailyTvls {
[chain:string]:{
  [timestamp: number]: number | undefined;
}
}

const handler = async (_event: any) => {
  const sumDailyTvls = {} as SumDailyTvls
  let lastDailyTimestamp = 0;
  const historicalProtocolTvls = await Promise.all(
    protocols.map(async (protocol) => {
      if (protocol.category === "Chain" || protocol.name === "AnySwap" || protocol.category === "Bridge") {
        return undefined;
      }
      const [lastTvl, historicalTvl] = await Promise.all([
        getLastRecord(hourlyTvl(protocol.id)),
        dynamodb.query({
          ExpressionAttributeValues: {
            ":pk": `dailyTvl#${protocol.id}`,
          },
          KeyConditionExpression: "PK = :pk",
        })
      ])
      if (historicalTvl.Items === undefined || historicalTvl.Items.length < 1) {
        return undefined;
      }
      const lastDailyItem = historicalTvl.Items[historicalTvl.Items.length - 1]
      if (lastTvl !== undefined && lastTvl.SK > lastDailyItem.SK && (lastDailyItem.SK + secondsInHour * 25) > lastTvl.SK) {
        lastTvl.SK = lastDailyItem.SK
        historicalTvl.Items[historicalTvl.Items.length - 1] = lastTvl
      }
      const lastTimestamp = getClosestDayStartTimestamp(
        historicalTvl.Items[historicalTvl.Items.length - 1].SK
      );
      lastDailyTimestamp = Math.max(lastDailyTimestamp, lastTimestamp);
      return {
        protocol,
        historicalTvl: historicalTvl.Items,
        lastTimestamp
      };
    })
  );
  historicalProtocolTvls.forEach((protocolTvl) => {
    if (protocolTvl === undefined) {
      return;
    }
    let { historicalTvl, protocol, lastTimestamp } = protocolTvl;
    const lastTvl = historicalTvl[historicalTvl.length - 1];
    while (lastTimestamp < lastDailyTimestamp) {
      lastTimestamp = getClosestDayStartTimestamp(lastTimestamp + 24 * secondsInHour)
      historicalTvl.push({
        ...lastTvl,
        SK: lastTimestamp,
      });
    }
    historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      sum(sumDailyTvls, "total", timestamp, item.tvl)
      let numChains = 0;
      Object.entries(item).forEach(([chain, tvl])=>{
        const chainName = getChainDisplayName(chain, true)
        if(chainCoingeckoIds[chainName] !== undefined){
          sum(sumDailyTvls, chainName, timestamp, tvl)
          numChains += 1;
        }
      })
      if(numChains === 0){
        sum(sumDailyTvls, transformNewChainName(protocol.chain), timestamp, item.tvl)
      }
    });
  });

  await Promise.all(Object.entries(sumDailyTvls).map(async ([chain, chainDailyTvls])=>{
    const chainResponse = Object.entries(chainDailyTvls).map(([timestamp, tvl]) => ({
      date: timestamp,
      totalLiquidityUSD: tvl,
    }));
    const compressedRespone = await promisify(brotliCompress)(JSON.stringify(chainResponse), {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    })
    const filename = chain === "total"? "lite/charts": `lite/charts/${chain}`
    await store(filename, compressedRespone, true)
  }))
}

export default wrapScheduledLambda(handler);
