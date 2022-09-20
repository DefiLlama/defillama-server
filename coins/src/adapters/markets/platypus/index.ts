import getTokenPrices from "./platypus";

export function platypus(timestamp: number = 0) {
  console.log("starting synthetix");
  return getTokenPrices(timestamp);
}
