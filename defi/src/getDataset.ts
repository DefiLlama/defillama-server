import { wrap, IResponse, errorResponse } from "./utils/shared";
import allProtocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import craftCsvDataset from "./storeTvlUtils/craftCsvDataset";
import { storeDataset, buildRedirect } from "./utils/s3";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  let protocolName = event.pathParameters?.protocol?.toLowerCase();

  if (protocolName?.endsWith(".csv")) {
    protocolName = protocolName?.substring(0, protocolName.length - ".csv".length);
  }

  const protocolData = allProtocols.find((prot) => sluggify(prot) === protocolName);

  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const csv = await craftCsvDataset([protocolData], true);
  const filename = `${protocolName}.csv`;

  if (process.env.stage !== "prod") {
    return { statusCode: 200, body: JSON.stringify(csv) };
  }

  await storeDataset(filename, csv);

  return buildRedirect(filename);
};

export default wrap(handler);
