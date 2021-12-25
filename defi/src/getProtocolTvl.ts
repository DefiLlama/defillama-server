import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import protocols from "./protocols/data";
import { getLastRecord, hourlyTvl } from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";

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
  const lastHourlyRecord = await getLastRecord(hourlyTvl(protocolData.id));
  if (lastHourlyRecord === undefined) {
    return errorResponse({
      message: "Protocol has no recorded TVL",
    });
  }

  return successResponse(lastHourlyRecord.tvl, 10 * 60); // 10 mins cache
};

export default wrap(handler);
