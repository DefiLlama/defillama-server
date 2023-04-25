import { multiCall } from "@defillama/sdk/build/abi";
import { log } from "@defillama/sdk";
import { BigNumber, utils } from "ethers";
import getBlock from "./block";
import { getTokenAndRedirectData } from "./database";
import { CoinData } from "./dbInterfaces";

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
): Promise<(Result4626 | null)[]> {
  const block: number | undefined = await getBlock(chain, timestamp);
  const { sharesDecimals, assets, symbols, ratios } = await getTokenData(
    block,
    chain,
    tokens,
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
    let assetPriceBN = BigNumber.from("0");
    try {
      assetPriceBN = utils.parseUnits(`${assetInfo.price}`, assetInfo.decimals);
    } catch (e) {
      assetPriceBN = BigNumber.from(
        (assetInfo.price * 10 ** assetInfo.decimals).toFixed(0),
      );
    }
    if (ratios[i] !== null) {
      const sharePrice = assetPriceBN.mul(ratios[i]).div(assetMagnitude);
      result.push({
        token: tokens[i].toLowerCase(),
        price: parseFloat(utils.formatUnits(sharePrice, assetInfo.decimals)),
        decimals: sharesDecimals[i],
        symbol: symbols[i],
      });
    } else {
      result.push(null);
    }
  }
  log(result);
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
) {
  const targets = tokens.map((target: string) => ({ target }));
  const multiCallForAbi = (abi: any) =>
    multiCall({ calls: targets, chain, block, abi });
  const [sharesDecimalsPromise, assetsPromise, symbolsPromise] = [
    multiCallForAbi("erc20:decimals"),
    multiCallForAbi(abi.asset),
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
    assetsPromise,
    symbolsPromise,
    ratiosPromise,
  ]);
  return {
    sharesDecimals: sharesDecimals.output.map(({ output }: any) => output),
    assets: assets.output.map(({ output }: any) => output),
    symbols: symbols.output.map(({ output }: any) => output),
    ratios: ratios.output.map(({ output }: any) => output),
  };
}

function magnitude(decimals: number) {
  return BigNumber.from(10).pow(decimals).toString();
}
