import { multiCall } from "@defillama/sdk/build/abi/index";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import { Result } from "../../utils/sdkInterfaces";
import getBlock from "../../utils/block";
import contracts from "./contracts.json";
import abi from "./abi.json";
import { wrappedGasTokens } from "../../utils/gasTokens";
const gasTokenDummyAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

async function processDbData(
  pools: { [pool: string]: { [address: string]: string } },
  coinsData: CoinData[],
  chain: string,
) {
  return Object.keys(pools)
    .map((b: string) => {
      const token =
        pools[b].underlying.toLowerCase() === gasTokenDummyAddress
          ? wrappedGasTokens[chain]
          : pools[b].underlying.toLowerCase();
      const coinData: CoinData = coinsData.filter(
        (c: CoinData) => c.address.toLowerCase() === token,
      )[0];

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
  pools: { [pool: string]: { [address: string]: string } },
  chain: string,
  poolTokenLiquidities: Result[],
  tokenInfos: any,
  writes: Write[],
  timestamp: number,
) {
  Object.keys(pools).forEach((p: string) => {
    const curr = pools[p];
    const underlying: string =
      curr.underlying.toLowerCase() === gasTokenDummyAddress
        ? wrappedGasTokens[chain]
        : curr.underlying.toLowerCase();
    const pool: string = curr.pool.toLowerCase();
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
  const pools: { [pool: string]: { [address: string]: string } } =
    contracts[chain as keyof typeof contracts];

  let tokenSupplies: Result[];
  let tokenInfos: any;
  [{ output: tokenSupplies }, tokenInfos] = await Promise.all([
    multiCall({
      abi: abi["totalLiquidity"],
      calls: Object.entries(pools).map((p: any) => ({
        target: p[1].pool,
      })),
      chain: chain as any,
      block,
      permitFailure: true,
    }),
    getTokenInfo(
      chain,
      Object.entries(pools).map((p: any) => p[1].pool),
      block,
      { withSupply: true },
    ),
  ]);

  let coinsData: CoinData[] = await getTokenAndRedirectData(
    Object.entries(pools).map((p: any) =>
      p[1].underlying.toLowerCase() === gasTokenDummyAddress
        ? wrappedGasTokens[chain]
        : p[1].underlying.toLowerCase(),
    ),
    chain,
    timestamp,
  );

  const underlyingTokenData = await processDbData(pools, coinsData, chain);

  return formWrites(
    underlyingTokenData.filter((d: any) => d != undefined),
    pools,
    chain,
    tokenSupplies.filter((d: any) => d != undefined),
    tokenInfos,
    writes,
    timestamp,
  );
}
