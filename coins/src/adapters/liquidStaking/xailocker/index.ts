import getTokenPrice from "./xailocker";

export function xailocker(timestamp: number = 0) {
    return getTokenPrice(timestamp);
}