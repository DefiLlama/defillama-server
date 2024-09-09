import getTokenPrices from "./fx-protocol";

export function fxProtocol(timestamp: number = 0) {
  return Promise.all([getTokenPrices(timestamp, "ethereum")]);
}
