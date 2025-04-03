import getTokenPrices from "./concentrator";

export function fxProtocol(timestamp: number = 0) {
  return Promise.all([getTokenPrices(timestamp, "ethereum")]);
}
