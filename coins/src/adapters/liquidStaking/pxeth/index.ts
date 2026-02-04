import getTokenPrices from "./pxeth";

export function pxeth(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
