import getTokenPrices from "./level";

export function level(timestamp: number = 0) {
  console.log("starting level finance");
  return getTokenPrices(timestamp)
}
