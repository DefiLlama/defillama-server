export const secondsBetweenCalls = 60 * 60;
export const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5; // 1.5 to add some wiggle room
export const secondsInDay = 60 * 60 * 24;
export const secondsInWeek = secondsInDay * 7;
export const secondsInHour = 60 * 60;
export const HOUR = 3600;
export const DAY = HOUR * 24;

export function toUNIXTimestamp(ms: number) {
  return Math.round(ms / 1000);
}

export function getCurrentUnixTimestamp() {
  return toUNIXTimestamp(Date.now());
}

export function getTimestampAtStartOfDay(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setHours(0, 0, 0, 0);
  return toUNIXTimestamp(dt.getTime() - dt.getTimezoneOffset() * 6e4);
}

export const getTimestampAtStartOfDayUTC = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  var date_utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  var startOfDay = Number(new Date(date_utc));
  var timestamp = startOfDay / 1000;
  return Math.floor(timestamp / 86400) * 86400;
};

export const getTimestampAtStartOfNextDayUTC = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  var date_utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  );
  return date_utc / 1000;
};

export function calcIsNewDay(timestamp: number) {
  return timestamp % 86400 === 0;
}

export const getTimestampAtStartOfHour = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  var date_utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  var startOfDay = Number(new Date(date_utc));
  var timestamp = startOfDay / 1000;
  return Math.floor(timestamp / 3600) * 3600;
};

export const getTimestampAtStartOfMonth = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const firstDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  return firstDay.valueOf() / 1000;
};

export const getTimestampAtStartOfNextMonth = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const firstDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return firstDay.valueOf() / 1000;
};

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

function pad(s: number) {
  return s < 10 ? "0" + s : s;
}

export function formatTimestampAsDate(timestamp: string) {
  const date = new Date(Number(timestamp) * 1000);
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1
  )}/${date.getFullYear()}`;
}
