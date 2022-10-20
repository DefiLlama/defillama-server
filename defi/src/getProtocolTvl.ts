import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import protocols from "./protocols/data";
import { getLastRecord, hourlyTvl } from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import standardizeProtocolName from "./utils/standardizeProtocolName";

const handler = async (
  event: AWSLambda.APIGatewayEvent
  ): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  let protocolData = [
    protocols.find((prot) => sluggify(prot) === protocolName)
  ];

  if (protocolData[0] === undefined) {
    const parentProtocol = parentProtocols.find(
      (parent) =>
        parent.name.toLowerCase() === standardizeProtocolName(protocolName)
    );

    protocolData =
      parentProtocol === undefined
        ? [undefined]
        : protocols.filter(
            (protocol) => protocol.parentProtocol === parentProtocol.id
          );
  }

  if (protocolData[0] == undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }
  const lastHourlyRecords = await Promise.all(
    protocolData.map((p) => {
      if (p == undefined) return;
      return getLastRecord(hourlyTvl(p.id));
    })
  );
  if (lastHourlyRecords[0] === undefined) {
    return errorResponse({
      message: "Protocol has no recorded TVL",
    });
  }
  const lastHourlyRecord = lastHourlyRecords.reduce((p, c) => {
    if (c == undefined) return Number(p);
    return Number(p) + Number(c.tvl);
  }, 0);
  return successResponse({ tvl: lastHourlyRecord }, 10 * 60); // 10 mins cache
};

export default wrap(handler);
