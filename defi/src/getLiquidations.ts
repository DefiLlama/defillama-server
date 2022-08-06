import { wrap, IResponse, successResponse } from "./utils/shared";
import { binResults } from "../DefiLlama-Adapters/liquidations/utils/binResults"

const adapters = ["aave-v2", "compound", "euler", "liquity", "maker"]; // this can be automated instead
const adapterModules = adapters.map(adapterName => ({
  module: require(`../DefiLlama-Adapters/liquidations/${adapterName}/index`),
  name: adapterName,
}));

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const data = await Promise.all(adapterModules.map(async adapter => {
    const liqs = await adapter.module.ethereum.liquidations();
    const {bins} = await binResults(liqs)
    return {
      protocol: adapter.name,
      bins
    }
  }))
  return successResponse(data, 5 * 60); //5 mins
};

export default wrap(handler);
