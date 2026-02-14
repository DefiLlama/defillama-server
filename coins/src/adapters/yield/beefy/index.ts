import getTokenPrices, { config } from "./beefy";
import { getWrappedBeefyPrices, wrappedBeefyChains } from "./wrappedBeefy";

const chains = Object.keys(config)

export function beefy(timestamp: number = 0) {
  return Promise.all(chains.map(i => getTokenPrices(i, timestamp)))
}

export function wrappedBeefy(timestamp: number = 0) {
  return Promise.all(wrappedBeefyChains.map(i => getWrappedBeefyPrices(i, timestamp)))
}
