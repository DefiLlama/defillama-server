import getTokenPrices from "./alchemix";

export function yearn(timestamp: number = 0) {
  console.log("starting alchemix");
  return getTokenPrices("optimism", timestamp);
}
