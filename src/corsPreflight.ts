import { IResponse, wrap } from "./utils";

const handler = async (
  _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  return {
    statusCode: 200,
    body: "",
    headers: {
      "cache-control": "max-age=3600, s-maxage=3600", // Caches preflight req on browser and proxy for 1 hour
      "access-control-allow-methods": "OPTIONS,GET",
      "access-control-allow-headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
    },
  };
};

export default wrap(handler);
