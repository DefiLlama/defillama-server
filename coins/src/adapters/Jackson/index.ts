import getTokenPrices from "./jackson";

export function jackson(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
