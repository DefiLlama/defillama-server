import { addToDBWritesList } from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write } from "../../utils/dbInterfaces";
import * as sdk from "@defillama/sdk";

const assets: { [chain: string]: string } = {
  base: "0xb125E6687d4313864e53df431d5425969c15Eb2F",
};

async function getTokenPrices(chain: string, timestamp: number) {
  const api = new sdk.ChainApi({ chain, timestamp });

  const numAssets = await api.call({
    target: assets[chain],
    abi: "uint8:numAssets",
  });

  const assetInfos = await api.multiCall({
    calls: Array.from({ length: numAssets }, (_, i) => ({
      target: assets[chain],
      params: [i],
    })),
    abi: "function getAssetInfo(uint8 i) view returns (tuple(uint8 offset, address asset, address priceFeed, uint64 scale, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap))",
  });

  const [prices, tokenInfo] = await Promise.all([
    api.multiCall({
      calls: assetInfos.map((info: any) => ({
        target: assets[chain],
        params: [info.priceFeed],
      })),
      abi: "function getPrice(address PriceFeed) external view returns (uint256)",
    }),
    getTokenInfo(
      chain,
      assetInfos.map((info: any) => info.asset),
      undefined,
    ),
  ]);

  let writes: Write[] = [];
  assetInfos.map((info: any, i: number) =>
    addToDBWritesList(
      writes,
      chain,
      info.asset,
      prices[i] / 10 ** 8,
      tokenInfo.decimals[i].output,
      tokenInfo.symbols[i].output,
      timestamp,
      "compound-v3",
      1,
    ),
  );

  return writes;
}

export default async function compoundV3(timestamp: number) {
  return Promise.all(
    Object.keys(assets).map((chain) => getTokenPrices(chain, timestamp)),
  );
}
