import getTokenPrices from "./worldes";

export function worldes(timestamp: number = 0) {
    return getTokenPrices("arbitrum", timestamp);
}
