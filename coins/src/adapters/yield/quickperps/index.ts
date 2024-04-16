import { config, getTokenPrices} from "./quickperps";

export function quickperps(timestamp: number = 0) {
  return Promise.all(Object.keys(config).map(chain => getTokenPrices(timestamp, chain)))
}
