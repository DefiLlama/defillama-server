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
): Promise<Result4626[]> {
  const block: number | undefined = await getBlock(chain, timestamp);
  const tokenData = await getTokenData(
    block,
    chain,
    tokens,
    hardCodedAssets,
  );
  const assetsInfo: CoinData[] = await getTokenAndRedirectData(
    tokenData.map(({ asset }) => asset),
    chain,
    timestamp,
  );

  const result: Result4626[] = [];
  for (const { token, asset, ratio, shareDecimals, symbol } of tokenData) {
    const assetInfo = assetsInfo.find(
      ({ address }) => asset.toLowerCase() === address.toLowerCase(),
    );
    if (!assetInfo) continue;

    const assetMagnitude = magnitude(assetInfo.decimals);
    let assetPriceBN = 0;
    assetPriceBN = assetInfo.price
    if (ratio !== null) {
      const sharePrice = assetPriceBN * ratio / +assetMagnitude
      result.push({
        token: token.toLowerCase(),
        price: sharePrice,
        decimals: shareDecimals,
        symbol,
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
): Promise<{ token: string, asset: string, shareDecimals: number, symbol: string, ratio: number }[]> {
  const targets = tokens.map((target: string) => ({ target }));
  const multiCallForAbi = (abi: any) =>
    multiCall({ calls: targets, chain, block, abi, permitFailure: true });
  let assetsPromise;
  if (!hardCodedAssets) assetsPromise = multiCallForAbi(abi.asset);
  const [sharesDecimalsPromise, symbolsPromise] = [
    multiCallForAbi("erc20:decimals"),
    multiCallForAbi("erc20:symbol"),
  ];
  const { output: sharesDecimals } = await sharesDecimalsPromise;
  const ratiosPromise = multiCall({
    calls: tokens.map((target: string, i: number) => ({
      target,
      params: magnitude(sharesDecimals[i].output),
    })),
    chain,
    block,
    abi: abi.convertToAssets,
    permitFailure: true,
  });
  const [{ output: assets }, { output: symbols }, { output: ratios }] = await Promise.all([
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
  return tokens
    .map((token, i) => ({
      token,
      shareDecimals: sharesDecimals[i].success ? sharesDecimals[i].output : null,
      asset: assets[i].success ? assets[i].output : null,
      symbol: symbols[i].success ? (symbols[i].output == "0x0000000000000000000000000000000000000000" ? wrappedGasTokens[chain] : symbols[i].output) : null,
      ratio: ratios[i].success ? ratios[i].output : null,
    }))
    .filter(({ shareDecimals, asset, symbol, ratio }) => shareDecimals !== null && asset !== null && symbol !== null && ratio !== null)
}

function magnitude(decimals: number) {
  return sdk.util.convertToBigInt(10 ** decimals).toString();
}
