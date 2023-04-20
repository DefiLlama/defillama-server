import { IResponse, wrap, errorResponse } from "./utils/shared";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const response = errorResponse({
    message: "This endpoint doesn't exist",
  } as any);
  if(response.headers===undefined){
    response.headers={}
  }
  response.headers["Cache-Control"] = `max-age=${3600}`; // 1hr

  return response;
};

export default wrap(handler);
