export const secondsBetweenCalls = 60 * 60;
export const secondsBetweenCallsExtra = secondsBetweenCalls * 1.5; // 1.5 to add some wiggle room
export function getCurrentUnixTimestamp() {
  return Math.round(Date.now() / 1000);
}
