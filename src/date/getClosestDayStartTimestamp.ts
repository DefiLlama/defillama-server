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
