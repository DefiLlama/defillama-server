import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const config: { [chain: string]: string[] } = {
  monad: [
    "0x7Cd231120a60F500887444a9bAF5e1BD753A5e59", // aHYPER
  ],
};

export async function accountable(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain) =>
      getAccountablePrices(chain, timestamp),
    ),
  );
}

async function getAccountablePrices(chain: string, timestamp: number) {
  const tokens = config[chain];
  const api = await getApi(chain, timestamp);

  const assets = await api.multiCall({
    abi: "address:asset",
    calls: tokens,
  });

  const vaultDecimals = await api.multiCall({
    abi: "uint8:decimals",
    calls: tokens,
  });

  const underlyingDecimals = await api.multiCall({
    abi: "uint8:decimals",
    calls: assets,
  });

  const converted = await api.multiCall({
    abi: "function convertToAssets(uint256 shares) external view returns (uint256)",
    calls: tokens.map((target, i) => ({
      target,
      params: BigInt(10 ** vaultDecimals[i]).toString(),
    })),
  });

  const pricesObject: any = {};
  tokens.forEach((token, i) => {
    if (!assets[i] || !converted[i]) return;
    const price = converted[i] / 10 ** underlyingDecimals[i];
    if (isNaN(price) || !isFinite(price)) return;
    pricesObject[token] = { underlying: assets[i], price };
  });

  return getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "accountable",
  });
}
