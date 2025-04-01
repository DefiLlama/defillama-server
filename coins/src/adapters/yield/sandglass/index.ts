import { getApiPrices } from "./api";

export function sandglass(timestamp: number = 0) {
  return Promise.all([getTokenPrices(timestamp)]);
}

export async function getTokenPrices(timestamp: number) {
  return await getApiPrices(timestamp);
}

sandglass();
