import getTokenPrices from "./serum";
export function serum(timestamp: number = 0) {
  console.log("starting serum");
  return getTokenPrices(timestamp);
}
