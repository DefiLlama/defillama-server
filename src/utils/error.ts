import * as Sentry from "@sentry/serverless";

export function reportError(message: string, protocolName: string) {
  const scope = new Sentry.Scope();
  scope.setTag("protocol", protocolName);
  const error = new Error(message);
  error.name = message;
  Sentry.AWSLambda.captureException(error, scope);
}

export function reportErrorObject(error: Error, tag: string, value: string) {
  const scope = new Sentry.Scope();
  scope.setTag(tag, value);
  Sentry.AWSLambda.captureException(error, scope);
}
