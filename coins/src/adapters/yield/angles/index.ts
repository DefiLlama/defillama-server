import getTokenPrices from "./mean-finance";

export function angles(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("sonic", timestamp),
  ]);
}
