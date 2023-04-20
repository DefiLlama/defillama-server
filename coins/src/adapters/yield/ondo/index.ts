import getTokenPrices from "./ondo";

export function ondo(timestamp: number = 0) {
  console.log("starting ondo");
  return getTokenPrices(timestamp)
}
