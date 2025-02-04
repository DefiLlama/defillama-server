import { config, getTokenPrices } from "./yieldFi";

export function yieldFi(timestamp: number = 0) {
	return Promise.all(Object.keys(config).map(chain => getTokenPrices(timestamp, chain)))
}