import getTokenPrices from "./ankr";

export function ankr(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
