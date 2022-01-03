import protocols from "./protocols/data";
import dynamodb from "./utils/shared/dynamodb";
import { getLastRecord, hourlyTvl } from './utils/getLastRecord'
import { getClosestDayStartTimestamp, secondsInHour } from "./utils/date";
import { getChainDisplayName, chainCoingeckoIds, transformNewChainName, extraSections } from "./utils/normalizeChain";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { store } from "./utils/s3";
import { constants, brotliCompress } from 'zlib'
import { promisify } from 'util'

function sum(sumDailyTvls:SumDailyTvls, chain:string, tvlSection:string, timestamp: number, itemTvl:number){
  if(sumDailyTvls[chain] === undefined){
    sumDailyTvls[chain] = {}
  }
  if(sumDailyTvls[chain][tvlSection] === undefined){
    sumDailyTvls[chain][tvlSection] = {}
  }
  if (typeof itemTvl === 'number' && !Number.isNaN(itemTvl)) {
    sumDailyTvls[chain][tvlSection][timestamp] = itemTvl + (sumDailyTvls[chain][tvlSection][timestamp] ?? 0);
  } else {
    console.log("itemTvl is NaN", itemTvl, chain, timestamp)
  }
}

interface SumDailyTvls {
[chain:string]:{
  [tvlSection:string]:{
    [timestamp: number]: number | undefined;
  }
}
}

export async function getHistoricalTvlForAllProtocols(){
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
  return {
    lastDailyTimestamp,
    historicalProtocolTvls
  }
}

const isLowercase = (str:string)=>str.toLowerCase()===str

const handler = async (_event: any) => {
  const sumDailyTvls = {} as SumDailyTvls
  
  const {historicalProtocolTvls, lastDailyTimestamp} = await getHistoricalTvlForAllProtocols();
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
      sum(sumDailyTvls, "total", "tvl", timestamp, item.tvl)
      let hasAtLeastOneChain = false;
      Object.entries(item).forEach(([chain, tvl])=>{
        const formattedChainName = getChainDisplayName(chain, true)
        if(extraSections.includes(formattedChainName)){
          sum(sumDailyTvls, "total", formattedChainName, timestamp, tvl)
          return
        }
        const [chainName, tvlSection] = formattedChainName.includes("-")?formattedChainName.split('-'):[formattedChainName, "tvl"];
        if(chainCoingeckoIds[chainName] !== undefined){
          sum(sumDailyTvls, chainName, tvlSection, timestamp, tvl)
          hasAtLeastOneChain = true;
        }
      })
      if(hasAtLeastOneChain === false){
        sum(sumDailyTvls, transformNewChainName(protocol.chain), "tvl", timestamp, item.tvl)
      }
    });
  });

  await Promise.all(Object.entries(sumDailyTvls).map(async ([chain, chainDailyTvls])=>{
    const chainResponse = Object.fromEntries(Object.entries(chainDailyTvls).map(
      ([section, tvls])=>[section, Object.entries(tvls)]
    ))
    const compressedRespone = await promisify(brotliCompress)(JSON.stringify(chainResponse), {
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
    })
    const filename = chain === "total"? "lite/charts": `lite/charts/${chain}`
    await store(filename, compressedRespone, true)
  }))
}

export default wrapScheduledLambda(handler);
