import getTokenPrices from "./levelFinance";

export function levelFinance(timestamp: number = 0) {
  console.log("starting level finance");
  return getTokenPrices(timestamp)
}
