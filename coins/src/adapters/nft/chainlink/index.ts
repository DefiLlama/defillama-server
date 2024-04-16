import getTokenPrices from "./chainlink";

export function chainlinkNFT(timestamp: number = 0) {
  console.log("starting chainlink Nft");
  return getTokenPrices("ethereum", timestamp);
}
