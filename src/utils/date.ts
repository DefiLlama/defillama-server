export const secondsBetweenCalls = 60 * 60;
export const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5; // 1.5 to add some wiggle room
export const secondsInDay = 60 * 60 * 24;
export const secondsInWeek = secondsInDay * 7;

export function getCurrentUnixTimestamp() {
  return Math.round(Date.now() / 1000);
}

export function getTimestampAtStartOfDay(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setHours(0, 0, 0, 0);
  return Math.floor(dt.getTime() / 1000);
}

export function getDay(timestamp: number | undefined): string {
  if (timestamp == undefined) {
    return "none";
  }
  var dt = new Date(timestamp * 1000);
  return dt.toDateString();
}

export function toUNIXTimestamp(ms: number) {
  return Math.round(ms / 1000);
}

export function getClosestDayStartTimestamp(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setHours(0, 0, 0, 0);
  const prevDayTimestamp = Math.floor(dt.getTime() / 1000);
  dt.setHours(24);
  const nextDayTimestamp = Math.floor(dt.getTime() / 1000);
  if (
    Math.abs(prevDayTimestamp - timestamp) <
    Math.abs(nextDayTimestamp - timestamp)
  ) {
    return prevDayTimestamp;
  } else {
    return nextDayTimestamp;
  }
}
