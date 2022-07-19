import getTokenPrices from "./curve";

export function curve() {
  return Promise.all([getTokenPrices("ethereum")]);
}
