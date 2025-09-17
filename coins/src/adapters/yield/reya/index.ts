import getTokenPrices from "./reya";

export function reya(timestamp: number = 0) {
  return Promise.all([getTokenPrices(timestamp, "reya")]);
}