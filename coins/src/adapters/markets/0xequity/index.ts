import getTokenPrices  from "./xequity";

export function xequity(timestamp: number = 0) {
  return Promise.all([
    getTokenPrices("arbitrum", timestamp),
    getTokenPrices("base", timestamp),
    getTokenPrices("unit0", timestamp),
  ]);
}

