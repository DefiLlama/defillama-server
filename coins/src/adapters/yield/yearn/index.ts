import getTokenPrices from "./yearnV2";

export function yearn() {
  return Promise.all([getTokenPrices("ethereum")]);
}
