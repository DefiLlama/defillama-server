import getTokenPrices, { supportedChains } from "./steer";



export function steer(timestamp: number = 0) {
  return Promise.all(supportedChains.map(i => getTokenPrices(i, timestamp)))
}