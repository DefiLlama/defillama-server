import getTokenPrices from "./townsquare";

export function townsquare(timestamp: number = 0) {
  return getTokenPrices("monad", timestamp);
}
