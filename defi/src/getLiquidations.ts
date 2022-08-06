import { wrap, IResponse } from "./utils/shared";
import { buildRedirect, liquidationsFilename } from "./utils/s3";
import invokeLambda from "./utils/shared/invokeLambda";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  await invokeLambda(`defillama-prod-storeLiquidations`, {})
  return buildRedirect(liquidationsFilename, 5 * 60); // 5 mins
};

export default wrap(handler);
