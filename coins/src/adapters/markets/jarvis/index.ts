import getTokenPrices from "./jarvis";

export function jarvis(timestamp: number = 0) {
  console.log("starting Jarvis Network");
  return Promise.all([
    getTokenPrices("polygon", timestamp),
  ]);
}
