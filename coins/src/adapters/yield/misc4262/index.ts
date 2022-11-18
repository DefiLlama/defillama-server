import getTokenPrices from "./misc";
import tokens from "./tokens.json";

export function misc4262(timestamp: number = 0) {
  console.log("starting misc 4262");
  return Promise.all(
    Object.keys(tokens).map((c) => getTokenPrices(c, timestamp))
  );
}
