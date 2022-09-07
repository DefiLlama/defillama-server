import getTokenPrices from "./euler";

export function euler(timestamp: number = 0) {
  console.log("starting euler");
  return getTokenPrices("ethereum", timestamp);
}
