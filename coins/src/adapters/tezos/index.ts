import getTokenPrices from "./tezos";

export function tezos(timestamp: number = 0) {
  return getTokenPrices(timestamp);
}
