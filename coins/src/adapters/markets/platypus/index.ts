import getTokenPrices from "./platypus";

export function platypus(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
