import getTokenPrices from "./avkat";

export function avkat(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
