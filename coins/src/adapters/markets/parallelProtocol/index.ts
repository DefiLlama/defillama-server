import { getTokenPrices } from "./parallelProtocol";

export function parallelProtocol(timestamp: number) {
  return getTokenPrices("ethereum", timestamp);
}
