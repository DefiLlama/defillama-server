import { wrap, IResponse, errorResponse } from "./utils";
import allProtocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import craftCsvDataset from './storeTvlUtils/craftCsvDataset'

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

  const response: IResponse = {
    statusCode: 200,
    body: csv,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${protocolName}.csv`,
    },
  };
  return response;
};

export default wrap(handler);
