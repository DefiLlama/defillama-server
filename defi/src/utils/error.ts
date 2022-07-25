export function reportError(message: string, protocolName: string) {
  console.error(protocolName, message);
}

/*
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
*/