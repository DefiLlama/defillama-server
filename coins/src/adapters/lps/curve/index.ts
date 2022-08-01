import getTokenPrices from "./curve";

export function curve(timestamp: number = 0) {
  return Promise.all([getTokenPrices("ethereum", timestamp)]);
}
