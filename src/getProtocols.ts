import { successResponse, wrap, IResponse } from "./utils";
import protocols, { Protocol } from "./protocols/data";
import { getLastRecord, hourlyTvl } from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import { normalizeChain, getDisplayChain } from "./utils/normalizeChain";
import dynamodb from "./utils/dynamodb";

export function getPercentChange(previous: number, current: number) {
  const change = (current / previous) * 100 - 100;
  if (change == Infinity) {
    return null;
  }
  return change;
}

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const coinMarketsPromises = []
  for (let i = 0; i < protocols.length; i += 100) {
    coinMarketsPromises.push(dynamodb.batchGet(protocols.slice(i, i+100)
      .filter(protocol => typeof protocol.gecko_id === "string")
      .map(protocol => ({
        PK: `asset#${protocol.gecko_id}`,
        SK: 0
      }))))
  }
  const coinMarkets = Promise.all(coinMarketsPromises).then(results=>results.reduce((p, c)=>{
    c.Responses!['prod-table'].forEach(t=>p[t.PK]=t);
    return p
  }, {} as any))
  const response = (
    await Promise.all(
      protocols.map(async (protocol) => {
        const lastHourlyRecord = await getLastRecord(hourlyTvl(protocol.id));
        if (lastHourlyRecord === undefined) {
          return null;
        }
        const returnedProtocol: Partial<Protocol> = { ...protocol };
        delete returnedProtocol.module;
        const chainTvls = {} as {
          [chain: string]: number;
        };
        protocol.chains.forEach((chain) => {
          const normalizedChain = normalizeChain(chain);
          const chainTvl = lastHourlyRecord[normalizedChain];
          if (chainTvl !== undefined) {
            chainTvls[chain] = chainTvl;
          }
        });
        const dataToReturn = {
          ...protocol,
          slug: sluggify(protocol),
          tvl: lastHourlyRecord.tvl,
          chainTvls,
          chain: getDisplayChain(protocol.chains),
          change_1h: getPercentChange(
            lastHourlyRecord.tvlPrev1Hour,
            lastHourlyRecord.tvl
          ),
          change_1d: getPercentChange(
            lastHourlyRecord.tvlPrev1Day,
            lastHourlyRecord.tvl
          ),
          change_7d: getPercentChange(
            lastHourlyRecord.tvlPrev1Week,
            lastHourlyRecord.tvl
          ),
        } as any;
        for (let extraData of ["staking", "pool2"]) {
          if (lastHourlyRecord[extraData] !== undefined) {
            dataToReturn[extraData] = lastHourlyRecord[extraData]
          }
        }
        if (typeof protocol.gecko_id === "string") {
          const coingeckoData = (await coinMarkets)[`asset#${protocol.gecko_id}`]
          if (coingeckoData !== undefined) {
            dataToReturn.fdv = coingeckoData.fdv;
            dataToReturn.mcap = coingeckoData.mcap;
          }
        }
        return dataToReturn
      })
    )
  ).filter((protocol) => protocol !== null);
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
