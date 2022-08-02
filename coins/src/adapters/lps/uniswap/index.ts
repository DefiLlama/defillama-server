import getTokenPrices from "./uniswap";

export function uniswap(timestamp: number = 0) {
  return getTokenPrices(
    "ethereum",
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    undefined,
    timestamp
  );
}
export function pancakeswap(timestamp: number = 0) {
  return getTokenPrices(
    "bsc",
    "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
    "https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2",
    timestamp
  );
}
