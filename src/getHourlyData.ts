import { successResponse, wrap, IResponse, errorResponse } from "./utils";
import { getHistoricalValues } from "./utils/dynamodb";
import protocols from "./protocols/data";
import {
  hourlyTvl,
  hourlyTokensTvl,
  hourlyUsdTokensTvl,
} from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";

// undocumented and likely to change whenever I want
// data returned will be wrong, requires cleaning
const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const protocolData = protocols.find(
    (prot) => sluggify(prot) === protocolName
  );
  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }
  const historicalUsdTvl = getHistoricalValues(hourlyTvl(protocolData.id));
  const historicalUsdTokenTvl = getHistoricalValues(
    hourlyUsdTokensTvl(protocolData.id)
  );
  const historicalTokenTvl = getHistoricalValues(
    hourlyTokensTvl(protocolData.id)
  );
  return successResponse({
      ...protocolData,
      tvl: await historicalUsdTvl,
      tokensInUsd: await historicalUsdTokenTvl,
      tokens: await historicalTokenTvl
  }, 10 * 60);
};

export default wrap(handler);
