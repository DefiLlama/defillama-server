import { multiCall, call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { Result, MultiCallResults } from "../../utils/sdkInterfaces";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import abi from "./abi.json";

function formWrites(
  underlyingBalances: Result[],
  coinsData: CoinData[],
  lpTokenInfo: any,
  chain: string,
  timestamp: number,
) {
  const lpTokenPrices = coinsData
    .map((c: CoinData) => {
      const underlyingBalance = underlyingBalances.find(
        (t: any) => c.address == t.input.target.toLowerCase(),
      );
      if (underlyingBalance == undefined) return;
      const index = underlyingBalances.indexOf(underlyingBalance);
      const lpSupply = lpTokenInfo.supplies[index].output;
      const lpDecimals = lpTokenInfo.decimals[index].output;
      const price =
        ((c.price * underlyingBalance.output) / lpSupply) *
        10 ** (c.decimals - lpDecimals);
      if (price == Infinity) return;

      return {
        address: underlyingBalances[index].input.params[0].toLowerCase(),
        price,
        decimals: c.decimals,
        symbol: lpTokenInfo.symbols[index].output,
        confidence: c.confidence,
      };
    })
    .filter((p: any) => p != undefined);

  const writes: Write[] = [];
  lpTokenPrices.map((p: any) =>
    addToDBWritesList(
      writes,
      chain,
      p.address,
      p.price,
      p.decimals,
      p.symbol,
      timestamp,
      "platypus",
      p.confidence,
    ),
  );

  return writes;
}
async function getTokensFromFactory(
  timestamp: number,
  block: number | undefined,
  chain: any,
  factory: string,
  poolInfoAbi: any,
) {
  let poolLength: number = (
    await call({
      target: factory,
      abi: abi.poolLength,
      chain,
      block,
    })
  ).output;

  const poolNums: number[] = Array.from(Array(Number(poolLength)).keys());

  let rawPoolAddresses: MultiCallResults = await multiCall({
    calls: poolNums.map((p: number) => ({
      target: factory,
      params: p,
    })),
    abi: poolInfoAbi,
    chain,
    block,
  });

  const poolAddresses: string[] = rawPoolAddresses.output.map(
    (p: any) => p.output.lpToken,
  );

  let lpTokenInfo: any;
  let underlyingTokens: Result[];
  [lpTokenInfo, { output: underlyingTokens }] = await Promise.all([
    getTokenInfo(chain, poolAddresses, block, { withSupply: true }),
    multiCall({
      calls: poolAddresses.map((p: string) => ({
        target: p,
      })),
      abi: abi.underlyingToken,
      chain,
      block,
    }),
  ]);

  let coinsData: CoinData[];
  let underlyingBalances: Result[];
  [coinsData, { output: underlyingBalances }] = await Promise.all([
    getTokenAndRedirectData(
      underlyingTokens.map((t: Result) => t.output.toLowerCase()),
      chain,
      timestamp,
    ),
    multiCall({
      calls: poolAddresses.map((p: string, i) => ({
        target: underlyingTokens[i].output,
        params: p,
      })),
      abi: "erc20:balanceOf",
      chain,
      block,
    }),
  ]);

  return formWrites(
    underlyingBalances,
    coinsData,
    lpTokenInfo,
    chain,
    timestamp,
  );
}
export default async function getTokenPrices(timestamp: number) {
  const chain: any = "avax";
  const block: number | undefined = await getBlock("avax", timestamp);
  let writes: Write[] = [];
  for (let factory of Object.entries(abi.poolInfo)) {
    writes.push(
      ...(await getTokensFromFactory(
        timestamp,
        block,
        chain,
        factory[0],
        factory[1],
      )),
    );
  }
  return writes;
}
