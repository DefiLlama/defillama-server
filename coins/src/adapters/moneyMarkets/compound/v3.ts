import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write } from "../../utils/dbInterfaces";
import * as sdk from "@defillama/sdk";

const assets: { [chain: string]: string[] } = {
  base: ["0xb125E6687d4313864e53df431d5425969c15Eb2F"],
  arbitrum: [
    "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf", // cUSDCv3
    "0xd98be00b5d27fc98112bde293e487f8d4ca57d07", // cUSDTv3
  ],
  ethereum: ["0x3afdc9bca9213a35503b077a6072f3d0d5ab0840"],
};

async function getCometPrices(
  chain: string,
  comet: string,
  timestamp: number,
) {
  const api = new sdk.ChainApi({ chain, timestamp });

  const [numAssets, baseAsset, baseScale] = await Promise.all([
    api.call({ target: comet, abi: "uint8:numAssets" }),
    api.call({ target: comet, abi: "address:baseToken" }),
    api.call({ target: comet, abi: "uint256:baseScale" }),
  ]);

  const assetInfos = await api.multiCall({
    calls: Array.from({ length: numAssets }, (_, i) => ({
      target: comet,
      params: [i],
    })),
    abi: "function getAssetInfo(uint8 i) view returns (tuple(uint8 offset, address asset, address priceFeed, uint64 scale, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap))",
  });

  const [prices, tokenInfo, [baseTokenInfo]] = await Promise.all([
    api.multiCall({
      calls: assetInfos.map((info: any) => ({
        target: comet,
        params: [info.priceFeed],
      })),
      abi: "function getPrice(address PriceFeed) external view returns (uint256)",
    }),
    getTokenInfo(
      chain,
      [...assetInfos.map((info: any) => info.asset), baseAsset],
      undefined,
    ),
    getTokenAndRedirectData([baseAsset], chain, timestamp),
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
      0.9,
    ),
  );

  if (!baseTokenInfo) return writes;

  const basePrice =
    (baseTokenInfo.price * baseScale) / 10 ** baseTokenInfo.decimals;
  if (!basePrice) return writes;

  addToDBWritesList(
    writes,
    chain,
    comet,
    basePrice,
    baseTokenInfo.decimals,
    baseTokenInfo.symbol,
    timestamp,
    "compound-v3",
    1,
  );

  return writes;
}

export default async function compoundV3(timestamp: number) {
  return Promise.all(
    Object.entries(assets).flatMap(([chain, comets]) =>
      comets.map((comet) => getCometPrices(chain, comet, timestamp)),
    ),
  );
}
