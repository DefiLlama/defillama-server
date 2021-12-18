import { wrap, IResponse, errorResponse } from "./utils";
import { storeDataset } from "./utils/s3";
import { getChainDisplayName, chainCoingeckoIds } from "./utils/normalizeChain";
import { getHistoricalTvlForAllProtocols } from './storeGetCharts'
import { formatTimestampAsDate, getClosestDayStartTimestamp, secondsInHour } from "./utils/date";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const rawChain = event.pathParameters!.chain!;
  const globalChain = rawChain === "all" ? null : getChainDisplayName(rawChain, true)
  const params = event.queryStringParameters ?? {};

  const sumDailyTvls = {} as {
    [ts: number]: {
      [protocol: string]: number
    }
  }

  const { historicalProtocolTvls, lastDailyTimestamp } = await getHistoricalTvlForAllProtocols();
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
      let chainToBeUsed = globalChain;
      const itemHasChains = Object.keys(item).some(chain=>chainCoingeckoIds[getChainDisplayName(chain, true)] !== undefined)
      if(itemHasChains){
        chainToBeUsed = null
      }
      const prefix = chainToBeUsed === null ? "" : `${chainToBeUsed}-`;
      let dayTvl = 0;
      Object.entries(item).forEach(([chain, tvl]) => {
        if(chain.startsWith(prefix)){
          const sectionName = chain.slice(prefix.length)
          if(params[sectionName] === "true"){
            dayTvl += tvl;
            return
          }
        }
        if((chainToBeUsed === null && chain === "tvl") || chainToBeUsed === getChainDisplayName(chain, true)){
          dayTvl += tvl;
        }
      })
      const timestamp = getClosestDayStartTimestamp(item.SK);
      if(sumDailyTvls[timestamp] === undefined){ sumDailyTvls[timestamp]={} }
      if(sumDailyTvls[timestamp]!.total === undefined){ sumDailyTvls[timestamp].Total=0 }
      sumDailyTvls[timestamp][protocol.name] = dayTvl;
      sumDailyTvls[timestamp].Total += dayTvl;
    });
  });

  const timestamps = Object.keys(sumDailyTvls).sort()
  const grid = [["Protocol", ...timestamps.map(t=>formatTimestampAsDate(t))]]
  let lastRow = 1;
  const protocolToRow = {
    'Total': lastRow
  } as {[chain:string]:number}
  timestamps.forEach((t, i)=>{
    grid[i+1]=[];
    Object.entries(sumDailyTvls[Number(t)]).forEach(([chain, tvl])=>{
      let row = protocolToRow[chain]
      if(row === undefined){
        row = ++lastRow;
        protocolToRow[chain]=lastRow;
      }
      grid[i+1][row]=String(tvl)
    })
  })
  const csv = grid.map(r=>r.join(',')).join('\n')
  const filename = `chain-dataset-${rawChain}.csv`
  await storeDataset(filename, csv)

  const response: IResponse = {
    statusCode: 307,
    body: "",
    headers: {
      "Location": `https://defillama-datasets.s3.eu-central-1.amazonaws.com/temp/${filename}`,
    },
  };
  return response;
};

export default wrap(handler);
