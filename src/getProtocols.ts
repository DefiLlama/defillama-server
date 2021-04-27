import { successResponse, wrap, IResponse } from "./utils";
import protocols, { Protocol } from "./protocols/data";
import getLastRecord from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";

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
  const response = (
    await Promise.all(
      protocols.map(async (protocol) => {
        const lastHourlyRecord = await getLastRecord(protocol.id);
        const item = lastHourlyRecord.Items?.[0];
        if (item === undefined) {
          return null;
        }
        const returnedProtocol: Partial<Protocol> = { ...protocol };
        delete returnedProtocol.module;
        return {
          ...protocol,
          slug: sluggify(protocol),
          tvl: item.tvl,
          change_1h: getPercentChange(item.tvlPrev1Hour, item.tvl),
          change_1d: getPercentChange(item.tvlPrev1Day, item.tvl),
          change_7d: getPercentChange(item.tvlPrev1Week, item.tvl),
        };
      })
    )
  ).filter((protocol) => protocol !== null);
  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
