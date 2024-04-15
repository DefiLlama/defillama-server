import getTokenPrices from "./tezos";

export function tezos(timestamp: number = 0) {
  console.log("starting tezos");
  return getTokenPrices(timestamp);
}
