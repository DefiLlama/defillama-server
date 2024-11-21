import getTokenPrices from "./jarvis";

export function jarvis(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("polygon", timestamp),
  ]);
}
