import getTokenPrices2 from "./curve2";
import getGaugePrices from "./gauges";
import getSpareTokens from "./spares";

const defaultRegistries = ['stableswap', 'crypto', 'stableFactory', 'cryptoFactory'];
export function curve1(timestamp: number = 0) {
  console.log("starting curve1");
  return Promise.all([
    getTokenPrices2("ethereum", ["crypto"], timestamp),
    getTokenPrices2("arbitrum", defaultRegistries, timestamp),
    getTokenPrices2("fantom", defaultRegistries, timestamp),
    getTokenPrices2("moonbeam", defaultRegistries, timestamp),
    getTokenPrices2("aurora", defaultRegistries, timestamp),
    getTokenPrices2("optimism", defaultRegistries, timestamp),
    getTokenPrices2("polygon", defaultRegistries, timestamp),
    getTokenPrices2("celo", defaultRegistries, timestamp),
    getTokenPrices2("bsc", defaultRegistries, timestamp),
    getTokenPrices2("avax", defaultRegistries, timestamp),
    getTokenPrices2("bsc", ['pcs'], timestamp, 'pcs'),
    getTokenPrices2("xdai", defaultRegistries, timestamp),
  ]);
}

export function gauges(timestamp: number = 0) {
  console.log("starting gauges");
  return Promise.all([
    getGaugePrices("ethereum", timestamp),
    getGaugePrices("arbitrum", timestamp),
    getGaugePrices("polygon", timestamp),
    getGaugePrices("fantom", timestamp),
    getGaugePrices("optimism", timestamp),
    getGaugePrices("avax", timestamp),
    getGaugePrices("moonbeam", timestamp),
    getGaugePrices("xdai", timestamp),
    getGaugePrices("celo", timestamp),
  ]);
}
export function spares(timestamp: number = 0) {
  console.log("starting curve spares");
  return getSpareTokens("ethereum", timestamp, [
    {
      address: "0x7b0eff0c991f0aa880481fdfa5624cb0bc9b10e1",
      nCoins: "4",
      token: "0x21ead867c8c5181854f6f8ce71f75b173d2bc16a",
    },
  ]);
}
