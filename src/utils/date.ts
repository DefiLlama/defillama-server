export const secondsBetweenCalls = 60 * 60;
export const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5; // 1.5 to add some wiggle room
export const secondsInDay = 60 * 60 * 24;
export const secondsInWeek = secondsInDay * 7;
export const secondsInHour = 60 * 60;

export function toUNIXTimestamp(ms: number) {
  return Math.round(ms / 1000);
}

export function getCurrentUnixTimestamp() {
  return toUNIXTimestamp(Date.now());
}

export function getTimestampAtStartOfDay(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setHours(0, 0, 0, 0);
  return toUNIXTimestamp(dt.getTime()-(dt.getTimezoneOffset()*6e4));
}

export function getDay(timestamp: number | undefined): string {
  if (timestamp == undefined) {
    return "none";
  }
  var dt = new Date(timestamp * 1000);
  return `${dt.getUTCDate()}-${dt.getUTCMonth()}-${dt.getUTCFullYear()}`;
}

export function getClosestDayStartTimestamp(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setUTCHours(0, 0, 0, 0);
  const prevDayTimestamp = toUNIXTimestamp(dt.getTime());
  dt.setUTCHours(24);
  const nextDayTimestamp = toUNIXTimestamp(dt.getTime());
  if (
    Math.abs(prevDayTimestamp - timestamp) <
    Math.abs(nextDayTimestamp - timestamp)
  ) {
    return prevDayTimestamp;
  } else {
    return nextDayTimestamp;
  }
}
