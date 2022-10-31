import getTokenPrices from "./alchemix";

export function alchemix(timestamp: number = 0) {
  console.log("starting alchemix");
  return getTokenPrices("optimism", timestamp);
}
