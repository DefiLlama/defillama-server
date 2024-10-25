import getTokenPrices from "./phux";

export function phux(timestamp: number = 0) {
  return getTokenPrices("pulse", timestamp);
}