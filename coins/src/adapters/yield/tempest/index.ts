import getTempestTokenPrices from "./tempest";

const chains = ["ethereum", "swellchain", "scroll"];

export function tempest(timestamp: number = 0) {
    return Promise.all(
        chains.map((chain) => {
            return getTempestTokenPrices(chain, timestamp);
        })
    );
}
