import { wrap, IResponse } from "./utils/shared";
import { craftProtocolResponse, wrapResponseOrRedirect } from "./getProtocol";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const response = await craftProtocolResponse({
    rawProtocolName: event.pathParameters?.protocol,
    useNewChainNames: true,
    useHourlyData: false,
    skipAggregatedTvl: true,
  });

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
