import getArberaTokenPrices from "./arbera";

const chains = ["berachain"];

export function arbera(timestamp: number = 0) {
  return Promise.all(
    chains.map((chain) => {
      return getArberaTokenPrices(chain, timestamp);
    })
  );
}
