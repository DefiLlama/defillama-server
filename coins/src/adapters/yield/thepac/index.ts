import getTokenPrices from "./thepac";

export function thePAC(timestamp: number = 0) {
  return getTokenPrices(timestamp)
}