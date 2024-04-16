import getTokenPrices, { config } from "./timeless";

const chains = Object.keys(config)

export function timeless(timestamp: number = 0) {
  console.log("starting timeless");
  return Promise.all(chains.map(i => getTokenPrices(i, timestamp)))
}
