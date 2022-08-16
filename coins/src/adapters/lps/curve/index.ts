import getTokenPrices from "./curve";

export function curve1(timestamp: number = 0) {
  return Promise.all([getTokenPrices("ethereum", timestamp)]);
}
export function curve2(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", timestamp),
    // getTokenPrices("polygon", timestamp),
    getTokenPrices("xdai", timestamp)
  ]);
}
export function curve3(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("avax", timestamp),
    getTokenPrices("fantom", timestamp)
  ]);
}
export function curve4(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("optimism", timestamp),
    getTokenPrices("moonbeam", timestamp),
    getTokenPrices("aurora", timestamp)
  ]);
}
