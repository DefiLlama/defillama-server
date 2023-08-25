import { config, getTokenPrices} from "./quickperps";

export function quickperps(timestamp: number = 0) {
  console.log("starting quickperps");
  return Promise.all(Object.keys(config).map(chain => getTokenPrices(timestamp, chain)))
}
