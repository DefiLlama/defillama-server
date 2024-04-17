import getTokenPrices, { config } from "./arrakis";

const chains = Object.keys(config)

export function arrakis(timestamp: number = 0) {
  return Promise.all(chains.map(i => getTokenPrices(i, timestamp)))
}
