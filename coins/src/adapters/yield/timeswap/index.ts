import getTokenPrices, { config } from "./timeswap";

export function timeswap(timestamp: number = 0) {
  console.log("starting timeswap");
  return Promise.all(
    Object.keys(config).map((chain: string) =>
      getTokenPrices(chain, timestamp),
    ),
  );
}
