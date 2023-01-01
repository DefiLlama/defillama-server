import {
  successResponse,
  wrap,
  IResponse,
  errorResponse
} from "./utils/shared";
import sluggify from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import standardizeProtocolName from "./utils/standardizeProtocolName";
import { getLastRecord, hourlyTvl } from "./utils/getLastRecord";
import protocols from "./protocols/data";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const protocolData = protocols.find(
    (prot: any) => sluggify(prot) === protocolName
  );
  if (!protocolData) {
    const parentProtocol = parentProtocols.find(
      (parent) =>
        parent.name.toLowerCase() === standardizeProtocolName(protocolName)
    );

    if (!parentProtocol)
      return errorResponse({
        message: "Protocol is not in our database"
      });

    const childProtocols = protocols.filter(
      (protocol: any) => protocol.parentProtocol === parentProtocol.id
    );
    const tvls: any[] = await Promise.all(
      childProtocols.map((c: any) => getLastRecord(hourlyTvl(c.id)))
    );

    const tvl = tvls.reduce((p: number, c: any) => p + c.tvl, 0);
    return successResponse(tvl, 10 * 60); // 10 mins cache
  }

  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database"
    });
  }

  const tvl = await getLastRecord(hourlyTvl(protocolData.id));
  return successResponse(tvl.tvl, 10 * 60); // 10 mins cache
};

export default wrap(handler);
