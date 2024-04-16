import getTokenPrices, { config } from "./beefy";

const chains = Object.keys(config)

export function beefy(timestamp: number = 0) {
  console.log("starting beefy");
  return Promise.all(chains.map(i => getTokenPrices(i, timestamp)))
}
