import getTokenPrices from "./yield-protocol";

export function yieldProtocol(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("ethereum", timestamp),
  ]);
}
