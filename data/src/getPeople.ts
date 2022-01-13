import { successResponse, wrap, IResponse } from "./utils/shared";
import people from "./people"

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  return successResponse(people);
};

export default wrap(handler);
