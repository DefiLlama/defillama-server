import * as Sentry from "@sentry/serverless";
import * as SentryTracing from "@sentry/tracing";
import { IResponse, credentialsCorsHeaders } from "./lambda-response";

interface SamplingContext {
  parentSampled: undefined;
  transactionContext: { name: string; op: string };
}

// See https://github.com/getsentry/sentry-javascript/issues/2984#issuecomment-748077304
SentryTracing.addExtensionMethods();
Sentry.AWSLambda.init({
  dsn:
    "https://d5738d8b071c404a9423cd670b66d227@o555782.ingest.sentry.io/5685887",
  tracesSampler: (_samplingContext: SamplingContext) => {
    return 0;
  },
  environment: process.env.stage,
});

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
  return Sentry.AWSLambda.wrapHandler(handler);
}

export default wrap;

export function wrapScheduledLambda(
  lambdaFunc: (event: any, context: AWSLambda.Context) => Promise<void>
): (
  event: void,
  context?: any,
  callback?: any
) => Promise<void | undefined> | void {
  return Sentry.AWSLambda.wrapHandler(lambdaFunc);
}
