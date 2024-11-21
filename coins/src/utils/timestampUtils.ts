const letterToSeconds: { [symbol: string]: number } = {
  w: 604800,
  d: 86400,
  h: 3600,
  m: 60
};
export function quantisePeriod(period: string): number {
  let normalizedPeriod: number;
  const normalized = Object.keys(letterToSeconds)
    .map((s: string) => {
      if (!period.includes(s)) return;
      const numberPeriod = period.replace(new RegExp(`[${s}]`, "i"), "");
      normalizedPeriod = Number(numberPeriod == "" ? 1 : numberPeriod);
      return normalizedPeriod * letterToSeconds[s];
    })
    .find((t: any) => t != null);
  if (normalized == null) return Number(period);
  return normalized;
}
export function getTimestampsArray(
  origin: number,
  workingForwards: boolean,
  delta: number,
  span: number
): number[] {
  const timestamps: number[] = [origin];
  let timestamp: number = origin;
  for (let i = 1; i < span; i++) {
    timestamp = workingForwards ? timestamp + delta : timestamp - delta;
    timestamps.push(timestamp);
  }
  return timestamps;
}
