import { wrap, IResponse } from "./utils/shared";
import { craftProtocolResponse, wrapResponseOrRedirect } from "./getProtocol";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const includeAggregatedTvl = event.queryStringParameters?.includeAggregatedTvl?.toLowerCase();

  const response = await craftProtocolResponse({
    rawProtocolName: event.pathParameters?.protocol,
    useNewChainNames: true,
    useHourlyData: false,
    skipAggregatedTvl: includeAggregatedTvl && includeAggregatedTvl === "true" ? false : true,
    draftApi: true
  });

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
