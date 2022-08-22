import getTokenPrices from "./ankr";

export function ankr(timestamp: number = 0) {
  console.log("starting ankr");
  return getTokenPrices(timestamp);
}
