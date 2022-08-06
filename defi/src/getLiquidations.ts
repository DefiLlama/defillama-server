import { wrap, IResponse, successResponse } from "./utils/shared";
import { binResults } from "@defillama/adapters/liquidations/utils/binResults";
import adaptersModules from "./utils/imports/adapters_liquidations";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const data = await Promise.all(Object.entries(adaptersModules).map(async ([name, module]) => {
    const liqs = await module.ethereum.liquidations();
    const {bins} = await binResults(liqs)
    return {
      protocol: name,
      bins
    }
  }))
  return successResponse(data, 5 * 60); //5 mins
};

export default wrap(handler);
