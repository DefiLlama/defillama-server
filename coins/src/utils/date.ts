export function toUNIXTimestamp(ms: number) {
  return Math.round(ms / 1000);
}

export function getCurrentUnixTimestamp() {
  return toUNIXTimestamp(Date.now());
}
