import getTokenPrices from "./axlp";

export function axlp(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}