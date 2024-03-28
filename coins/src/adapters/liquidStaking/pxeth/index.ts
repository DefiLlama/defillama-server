import getTokenPrices from "./pxeth";

export function pxeth(timestamp: number = 0) {
  console.log("starting pxeth");
  return getTokenPrices(timestamp);
}
