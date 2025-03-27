import { config, getTokenPrices} from "./levelFinance";

export function levelFinance(timestamp: number = 0) {
  return Promise.all(Object.keys(config).map(chain => getTokenPrices(timestamp, chain)))
}
