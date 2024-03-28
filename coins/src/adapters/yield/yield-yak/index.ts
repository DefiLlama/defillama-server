import getTokenPrices, { config } from "./yieldYak";

export function yieldYak(timestamp: number = 0) {
  console.log("starting yield-yak");
  return Promise.all(Object.keys(config).map(chain => getTokenPrices(chain, timestamp)));
}
