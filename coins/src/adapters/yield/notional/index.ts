import getTokenPrices from "./notional";

export function notional(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("ethereum", timestamp),
  ]);
}