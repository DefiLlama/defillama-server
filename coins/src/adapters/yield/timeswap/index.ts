import getTokenPrices, { config } from "./timeswap";

export function timeswap(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain: string) =>
      getTokenPrices(chain, timestamp),
    ),
  );
}
