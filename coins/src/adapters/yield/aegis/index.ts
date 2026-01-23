import getAegisTokenPrices, { tokens } from "./tokens";

export function aegis(timestamp: number = 0) {
  const chainsWithTokens = Object.keys(tokens);
  
  return Promise.all(
    chainsWithTokens.map((chain) =>
      getAegisTokenPrices(chain, timestamp)
    )
  );
}