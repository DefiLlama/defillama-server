import getTokenPrices from "./chainlink";

export function chainlinkNFT(timestamp: number = 0) {
  return getTokenPrices("ethereum", timestamp);
}
