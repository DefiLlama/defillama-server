import getTokenPrices from "./euler";

export function euler(timestamp: number = 0) {
  return getTokenPrices("ethereum", timestamp);
}
