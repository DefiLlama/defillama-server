import { wrap, IResponse, errorResponse, cache20MinResponse } from "./utils/shared";
import protocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import craftProtocol from "./utils/craftProtocol";
import parentProtocols from "./protocols/parentProtocols";
import craftParentProtocol from "./utils/craftParentProtocol";
import standardizeProtocolName from "./utils/standardizeProtocolName";
import { buildRedirectR2, storeDatasetR2 } from "./utils/r2";

export async function craftProtocolResponse({
  rawProtocolName,
  useNewChainNames,
  useHourlyData,
  skipAggregatedTvl,
  draftApi,
}: {
  rawProtocolName: string | undefined;
  useNewChainNames: boolean;
  useHourlyData: boolean;
  skipAggregatedTvl: boolean;
  draftApi: boolean
}) {
  const protocolName = rawProtocolName?.toLowerCase();

  const protocolData = protocols.find((prot) => sluggify(prot) === protocolName);

  if (!protocolData) {
    const parentProtocol = parentProtocols.find(
      (parent) => parent.name.toLowerCase() === standardizeProtocolName(protocolName)
    );

    if (!parentProtocol) {
      return errorResponse({
        message: "Protocol is not in our database",
      });
    }

    return craftParentProtocol({ parentProtocol, useNewChainNames, useHourlyData, skipAggregatedTvl,draftApi });
  }

  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  return craftProtocol({ protocolData, useNewChainNames, useHourlyData, skipAggregatedTvl });
}

export async function wrapResponseOrRedirect(response: any) {
  const jsonData = JSON.stringify(response);
  const dataLength = Buffer.byteLength(jsonData, "utf8");

  if (process.env.stage !== "prod" || dataLength < 5.5e6) {
    return cache20MinResponse(response);
  } else {
    const filename = `protocol-${response.name}.json`;

    await storeDatasetR2(filename, jsonData, "application/json");

    return buildRedirectR2(filename, 10 * 60);
  }
}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const response = await craftProtocolResponse({
    rawProtocolName: event.pathParameters?.protocol,
    useNewChainNames: false,
    useHourlyData: false,
    skipAggregatedTvl: false,
    draftApi: false
  });

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
