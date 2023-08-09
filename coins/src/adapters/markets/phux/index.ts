import getTokenPrices from "./phux";

export function phux(timestamp: number = 0) {
  console.log("starting phux lps");
  return getTokenPrices("pulse", timestamp);
}