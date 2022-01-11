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

export const PUT_DAILY_VOLUME_ERROR = "PUT_DAILY_VOLUME";

export function reportDexVolumeError({
  id,
  timestamp,
  category,
  message,
}: {
  id: number;
  timestamp: number;
  category: string;
  message: string;
}) {
  const scope = new Sentry.Scope();
  const errorName = `${id}-${timestamp}-${category}`;
  scope.setTag("dexvolume", id);
  const error = new Error(message);
  error.name = errorName;
  Sentry.AWSLambda.captureException(error, scope);
  throw error;
}
