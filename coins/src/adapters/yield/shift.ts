import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const config: { [chain: string]: string[] } = {
  base: [
    "0xaf69Bf9ea9E0166498c0502aF5B5945980Ed1E0E",
    "0x4cE3ec1b7B4FFb33A0B70c64a0560A3F341AA2E1",
  ],
}

export async function shift(timestamp: number) {
  return Promise.all(
    Object.keys(config).map((k: string) => getTokenPrices(timestamp, k)),
  );
}

async function getTokenPrices(timestamp: number, chain: string) {
  const api = await getApi(chain, timestamp);
  const tokens = config[chain]
  const prices = await api.multiCall({
    abi: "function getSharePrice() view returns (uint256)",
    calls:tokens,
  })
  const pricesObject: any = {};
  tokens.forEach((t, i) => {
    pricesObject[t] = {
      price: prices[i] / 1e6,
    }
  })
  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "shift",
  });
}