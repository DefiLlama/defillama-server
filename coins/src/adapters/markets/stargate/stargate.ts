import { multiCall } from "@defillama/sdk/build/abi/index";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import { Result } from "../../utils/sdkInterfaces";
import getBlock from "../../utils/block";
import contracts from "./contracts.json";
import abi from "./abi.json";
import { wrappedGasTokens } from "../../utils/gasTokens";
const gasTokenDummyAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

type FlatPools = { [pool: string]: string };

async function processDbData(
  pools: FlatPools,
  coinsData: { [key: string]: CoinData },
  chain: string,
) {
  return Object.keys(pools)
    .map((b: string) => {
      const token =
        pools[b].toLowerCase() === gasTokenDummyAddress
          ? wrappedGasTokens[chain]
          : pools[b].toLowerCase();
      const coinData: CoinData = coinsData[token];

      if (coinData == undefined) {
        console.log(
          `Couldn't find underlying data for ${chain}:${token} on stargate`,
        );
        return;
      }
      return {
        price: coinData.price,
        decimals: coinData.decimals,
        confidence: coinData.confidence,
        address: coinData.address,
      };
    })
    .filter((t) => t !== undefined);
}
function formWrites(
  underlyingTokenData: any[],
  pools: FlatPools,
  chain: string,
  poolTokenLiquidities: Result[],
  tokenInfos: any,
  writes: Write[],
  timestamp: number,
) {
  Object.keys(pools).forEach((p: string) => {
    const underlying: string =
      pools[p].toLowerCase() === gasTokenDummyAddress
        ? wrappedGasTokens[chain]
        : pools[p].toLowerCase();
    const pool: string = p.toLowerCase();
    const underlyingInfo = underlyingTokenData.find(
      (x: any) => x.address.toLowerCase() === underlying,
    );
    if (!underlyingInfo) return;
    const underlyingPrice: number = underlyingInfo.price;
    let poolTokenLiquidity: any = poolTokenLiquidities.find(
      (x: any) => x.input.target.toLowerCase() === pool,
    );
    if (!poolTokenLiquidity.output) return;
    const poolSupply: number = tokenInfos.supplies.find(
      (x: any) => x.input.target.toLowerCase() === pool,
    ).output;
    const poolDecimals: number = tokenInfos.decimals.find(
      (x: any) => x.input.target.toLowerCase() === pool,
    ).output;
    const poolSymbol: string = tokenInfos.symbols.find(
      (x: any) => x.input.target.toLowerCase() === pool,
    ).output;
    const price: number =
      underlyingPrice * (poolTokenLiquidity.output / poolSupply);
    if (!price) return;
    addToDBWritesList(
      writes,
      chain,
      pool,
      price,
      poolDecimals,
      poolSymbol,
      timestamp,
      "stargate",
      underlyingInfo.confidence,
    );
  });
  return writes;
}
export default async function getTokenPrices(chain: string, timestamp: number) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  const pools: { [pool: string]: { underlying: string; pools: string[] } } =
    contracts[chain as keyof typeof contracts];

  const flatPools: FlatPools = {};
  Object.keys(pools).map((key: string) =>
    pools[key].pools.map((pool: string) => {
      flatPools[pool] = pools[key].underlying;
    }),
  );

  let tokenSupplies: Result[];
  let tokenInfos: any;
  let tokenSupplies2: Result[];
  [{ output: tokenSupplies }, { output: tokenSupplies2 }, tokenInfos] =
    await Promise.all([
      multiCall({
        abi: abi.totalLiquidity,
        calls: Object.keys(flatPools).map((target) => ({
          target,
        })),
        chain: chain as any,
        block,
        permitFailure: true,
      }),
      multiCall({
        abi: abi.totalLiquidity,
        calls: Object.keys(flatPools).map((target) => ({
          target,
        })),
        chain: chain as any,
        block,
        permitFailure: true,
      }),
      getTokenInfo(
        chain,
        Object.keys(flatPools).map((p) => p),
        block,
        { withSupply: true },
      ),
    ]);

  let coinsData = await getTokenAndRedirectDataMap(
    Object.values(flatPools).map((p) =>
      p.toLowerCase() === gasTokenDummyAddress
        ? wrappedGasTokens[chain]
        : p.toLowerCase(),
    ),
    chain,
    timestamp,
  );

  const underlyingTokenData = await processDbData(flatPools, coinsData, chain);

  return formWrites(
    underlyingTokenData.filter((d: any) => d != undefined),
    flatPools,
    chain,
    tokenSupplies.filter((d: any) => d != undefined),
    tokenInfos,
    writes,
    timestamp,
  );
}
