import getTempestTokenPrices from "./tempest";

export function tempest(timestamp: number = 0) {
  return Promise.all([
    getTempestTokenPrices("ethereum", timestamp),
  ]);
}
