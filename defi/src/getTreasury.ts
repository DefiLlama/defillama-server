import { wrap, IResponse, errorResponse } from "./utils/shared";
import { wrapResponseOrRedirect } from "./getProtocol";
import craftProtocol from "./utils/craftProtocol";
import treasuries from "./protocols/treasury";
import sluggify from "./utils/sluggify";
import entities from "./protocols/entities";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase();
  const protocolData = protocolName?.startsWith("entity")?
    entities.find(p=> "entity-" + sluggify(p) === protocolName)
  : treasuries.find((prot) => sluggify(prot) === protocolName + "-(treasury)");

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

  return wrapResponseOrRedirect(response, "treasury/");
};

export default wrap(handler);
