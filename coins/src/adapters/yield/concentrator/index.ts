import getTokenPrices from "./concentrator";

export function concentrator(timestamp: number = 0) {
  return Promise.all([getTokenPrices(timestamp, "ethereum")]);
}
