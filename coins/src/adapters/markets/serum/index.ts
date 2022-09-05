import getTokenPrices from "./serum";
export function serum() {
  console.log("starting serum");
  return getTokenPrices();
}
