export const secondsBetweenCalls = 60 * 60;
export const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5; // 1.5 to add some wiggle room
export function getCurrentUnixTimestamp() {
  return Math.round(Date.now() / 1000);
}
export function getTimestampAtStartOfDay(timestamp: number) {
  const dt = new Date(timestamp * 1000);
  dt.setHours(0, 0, 0, 0);
  return Math.floor(dt.getTime() / 1000);
}
