import getTokenPrices from "./convex";

export function convex(timestamp: number = 0) {
  console.log("starting convex");
  return getTokenPrices(timestamp);
}
