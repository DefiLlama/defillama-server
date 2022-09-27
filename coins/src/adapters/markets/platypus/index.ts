import getTokenPrices from "./platypus";

export function platypus(timestamp: number = 0) {
  console.log("starting platypus");
  return getTokenPrices(timestamp);
}
