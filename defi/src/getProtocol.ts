import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import protocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import { storeDataset, buildRedirect } from "./utils/s3";
import craftProtocol from "./utils/craftProtocol";
import parentProtocols from "./protocols/parentProtocols";
import craftParentProtocol from "./utils/craftParentProtocol";
import standardizeProtocolName from "./utils/standardizeProtocolName";

export async function craftProtocolResponse(
  rawProtocolName: string | undefined,
  useNewChainNames: boolean,
  useHourlyData: boolean
) {
  const protocolName = rawProtocolName?.toLowerCase();

  const protocolData = protocols.find(
    (prot) => sluggify(prot) === protocolName
  );

  if (!protocolData) {
    const parentProtocol = parentProtocols.find(
      (parent) =>
        parent.name.toLowerCase() === standardizeProtocolName(protocolName)
    );

    if (!parentProtocol) {
      return errorResponse({
        message: "Protocol is not in our database",
      });
    }

    return craftParentProtocol(parentProtocol, useNewChainNames, useHourlyData);
  }

  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  return craftProtocol(protocolData, useNewChainNames, useHourlyData);
}

export async function wrapResponseOrRedirect(response: any) {
  if (response.name === "DODO") {
    console.log("DODWRAPRESPONSESTART", Object.keys(response));
  }

  const jsonData = JSON.stringify(response);
  const dataLength = Buffer.byteLength(jsonData, "utf8");
  if (dataLength >= 5.8e6) {
    if (response.name === "DODO") {
      console.log("DODOS3START", Object.keys(response));
    }

    const filename = `protocol-${response.name}.json`;
    await storeDataset(filename, jsonData, "application/json");

    if (response.name === "DODO") {
      console.log("DODOS3END", Object.keys(response));
    }

    return buildRedirect(filename);
  } else {
    if (response.name === "DODO") {
      console.log("DODWRAPRESPONSEEND", Object.keys(response));
    }
    return successResponse(response, 10 * 60); // 10 mins cache
  }
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const response = await craftProtocolResponse(
    event.pathParameters?.protocol,
    false,
    false
  );

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
