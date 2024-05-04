import getTokenPrices from "./serum";
export function serum(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
