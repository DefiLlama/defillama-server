import { IResponse, credentialsCorsHeaders } from "./lambda-response";

type Event =
  | AWSLambda.APIGatewayEvent
  | {
      source: string;
    };

function wrap(
  lambdaFunc: (event: AWSLambda.APIGatewayEvent) => Promise<IResponse>
): (
  event: Event,
  context?: any,
  callback?: any
) => Promise<IResponse | "pinged" | undefined> | void {
  const handler = async (event: Event) => {
    if ("source" in event) {
      if (event.source === "serverless-plugin-warmup") {
        return "pinged";
      }
      throw new Error("Unexpected source");
    }
    return lambdaFunc(event).then((response) => ({
      ...response,
      headers: {
        ...response.headers,
        ...credentialsCorsHeaders(),
      },
    }));
  };
  return handler;
}

export default wrap;

export function wrapScheduledLambda(
  lambdaFunc: (event: any, context: AWSLambda.Context) => Promise<void>
): (
  event: void,
  context?: any,
  callback?: any
) => Promise<void | undefined> | void {
  if(process.env.stage !== "prod"){
    return ()=>{console.log("This lambda is getting ignored, stage is not prod")}
  }
  return lambdaFunc;
}
