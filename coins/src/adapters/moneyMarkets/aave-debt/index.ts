import getTokenPrices, { config } from "./aaveDebt";

const chains = Object.keys(config)

export function aaveDebt(timestamp: number = 0) {
  console.log("starting aaveDebt");
  return Promise.all(chains.map(i => getTokenPrices(i, timestamp)))
}
