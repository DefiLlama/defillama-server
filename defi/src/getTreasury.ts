import { wrap, IResponse, errorResponse } from "./utils/shared";
import { wrapResponseOrRedirect } from "./getProtocol";
import craftProtocol from "./utils/craftProtocol";
import treasuries from "./protocols/treasury";
import sluggify from "./utils/sluggify";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase() + "-(treasury)";
  const protocolData = treasuries.find((prot) => sluggify(prot) === protocolName);

  if (!protocolData) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const response = await craftProtocol({
    protocolData,
    useNewChainNames: true,
    useHourlyData: false,
    skipAggregatedTvl: true,
  });

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
