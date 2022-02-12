import { wrap, IResponse, errorResponse } from "./utils/shared";
import allProtocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import craftCsvDataset from './storeTvlUtils/craftCsvDataset'
import { storeDataset } from "./utils/s3";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  let protocolName = event.pathParameters?.protocol?.toLowerCase();
  protocolName = protocolName?.substring(
    0,
    protocolName.length - ".csv".length
  );
  const protocolData = allProtocols.find(
    (prot) => sluggify(prot) === protocolName
  );
  if (protocolData === undefined) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const csv = await craftCsvDataset([protocolData], true)
  const filename = `${protocolName}.csv`
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
