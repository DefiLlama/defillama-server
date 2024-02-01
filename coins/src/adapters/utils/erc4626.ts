import { multiCall } from "@defillama/sdk/build/abi";
import * as sdk from "@defillama/sdk";
import getBlock from "./block";
import { getTokenAndRedirectData } from "./database";
import { CoinData } from "./dbInterfaces";
import { wrappedGasTokens } from "./gasTokens";

export type Result4626 = {
  token: string;
  price: number;
  decimals: number;
  symbol: string;
};
export async function calculate4626Prices(
  chain: any,
  timestamp: number,
  tokens: string[],
  hardCodedAssets?: string[],
): Promise<(Result4626 | null)[]> {
  const block: number | undefined = await getBlock(chain, timestamp);
  const { sharesDecimals, assets, symbols, ratios } = await getTokenData(
    block,
    chain,
    tokens,
    hardCodedAssets,
  );
  const assetsInfo: CoinData[] = await getTokenAndRedirectData(
    assets,
    chain,
    timestamp,
  );

  const result: (Result4626 | null)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const assetInfo = assetsInfo.find(
      ({ address }) => assets[i].toLowerCase() === address.toLowerCase(),
    );
    if (!assetInfo) continue;

    const assetMagnitude = magnitude(assetInfo.decimals);
    let assetPriceBN = 0;
    assetPriceBN = assetInfo.price
    if (ratios[i] !== null) {
      const sharePrice = assetPriceBN * ratios[i] / +assetMagnitude
      result.push({
        token: tokens[i].toLowerCase(),
        price: sharePrice,
        decimals: sharesDecimals[i],
        symbol: symbols[i],
      });
    }
  }
  return result;
}

const abi = {
  asset: "address:asset",
  convertToAssets: "function convertToAssets(uint256) view returns (uint256)",
};

async function getTokenData(
  block: number | undefined,
  chain: any,
  tokens: string[],
  hardCodedAssets?: string[],
) {
  const targets = tokens.map((target: string) => ({ target }));
  const multiCallForAbi = (abi: any) =>
    multiCall({ calls: targets, chain, block, abi });
  let assetsPromise;
  if (!hardCodedAssets) assetsPromise = multiCallForAbi(abi.asset);
  const [sharesDecimalsPromise, symbolsPromise] = [
    multiCallForAbi("erc20:decimals"),
    multiCallForAbi("erc20:symbol"),
  ];
  const sharesDecimals = await sharesDecimalsPromise;
  const ratiosPromise = multiCall({
    calls: tokens.map((target: string, i: number) => ({
      target,
      params: magnitude(sharesDecimals.output[i].output),
    })),
    chain,
    block,
    abi: abi.convertToAssets,
  });
  const [assets, symbols, ratios] = await Promise.all([
    hardCodedAssets
      ? {
          output: hardCodedAssets.map((output: string) => ({
            output,
          })),
        }
      : assetsPromise,
    symbolsPromise,
    ratiosPromise,
  ]);
  return {
    sharesDecimals: sharesDecimals.output.map(({ output }: any) => output),
    assets: assets.output.map(({ output }: any) =>
      output == "0x0000000000000000000000000000000000000000"
        ? wrappedGasTokens[chain]
        : output,
    ),
    symbols: symbols.output.map(({ output }: any) => output),
    ratios: ratios.output.map(({ output }: any) => output),
  };
}

function magnitude(decimals: number) {
  return sdk.util.convertToBigInt(10 ** decimals).toString();
}
