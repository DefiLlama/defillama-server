import { getTokenPrices } from "./parallelProtocol";

export function parallelProtocol(timestamp: number = 0) {
  return Promise.all([getTokenPrices("ethereum", timestamp)]);
}
