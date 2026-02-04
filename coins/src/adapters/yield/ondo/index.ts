import getTokenPrices from "./ondo";

export function ondo(timestamp: number = 0) {
  return getTokenPrices(timestamp)
}
