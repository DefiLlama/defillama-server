import { wrap, IResponse, successResponse } from "./utils/shared";
import { binResults } from "../DefiLlama-Adapters/liquidations/utils/binResults"

const adapters = ["aave-v2", "compound", "euler", "liquity", "maker"]; // this can be automated instead

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const data = await Promise.all(adapters.map(async adapterName => {
    const adapter = require(`../DefiLlama-Adapters/liquidations/${adapterName}/index`)
    const liqs = await adapter.ethereum.liquidations();
    const {bins} = await binResults(liqs)
    return {
      protocol: adapterName,
      bins
    }
  }))
  return successResponse(data, 5 * 60); //5 mins
};

export default wrap(handler);
