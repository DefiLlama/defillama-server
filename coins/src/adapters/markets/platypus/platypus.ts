import { multiCall, call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { Result, MultiCallResults } from "../../utils/sdkInterfaces";
import { getTokenInfo } from "../../utils/erc20";
import { Write, Read } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import abi from "./abi.json";

function formWrites(
  underlyingBalances: Result[],
  coinsData: Read[],
  lpTokenInfo: any,
  chain: string,
  timestamp: number
) {
  const lpTokenPrices = underlyingBalances
    .map((b: any) => {
      let coinData: Read = coinsData.filter((c: Read) =>
        c.dbEntry.PK.includes(b.input.target.toLowerCase())
      )[0];

      if (coinData == undefined) return;

      let underlyingPrice: number =
        coinData.redirect.length != 0
          ? coinData.redirect[0].price
          : coinData.dbEntry.price;

      let confidence: number =
        coinData.redirect.length != 0
          ? coinData.redirect[0].confidence
          : coinData.dbEntry.confidence;

      const underlyingBalance = underlyingBalances.filter((t: any) =>
        coinData.dbEntry.PK.includes(t.input.target.toLowerCase())
      )[0];
      const lpSupply =
        lpTokenInfo.supplies[underlyingBalances.indexOf(underlyingBalance)]
          .output;

      const lpDecimals =
        lpTokenInfo.decimals[underlyingBalances.indexOf(underlyingBalance)]
          .output;
      const price =
        ((underlyingPrice * underlyingBalance.output) / lpSupply) *
        10 ** (coinData.dbEntry.decimals - lpDecimals);

      return {
        price,
        decimals: coinData.dbEntry.decimals,
        confidence,
        address: b.input.params[0].toLowerCase(),
        symbol:
          lpTokenInfo.symbols[underlyingBalances.indexOf(underlyingBalance)]
            .output
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
      p.confidence
    )
  );

  return writes;
}
async function getTokensFromFactory(
  timestamp: number,
  block: number | undefined,
  chain: any,
  factory: string,
  poolInfoAbi: any
) {
  let poolLength: number = (
    await call({
      target: factory,
      abi: abi.poolLength,
      chain,
      block
    })
  ).output;

  const poolNums: number[] = Array.from(Array(Number(poolLength)).keys());

  let rawPoolAddresses: MultiCallResults = await multiCall({
    calls: poolNums.map((p: number) => ({
      target: factory,
      params: p
    })),
    abi: poolInfoAbi,
    chain,
    block
  });

  const poolAddresses: string[] = rawPoolAddresses.output.map(
    (p: any) => p.output.lpToken
  );

  let lpTokenInfo: any;
  let underlyingTokens: Result[];
  [lpTokenInfo, { output: underlyingTokens }] = await Promise.all([
    getTokenInfo(chain, poolAddresses, block),
    multiCall({
      calls: poolAddresses.map((p: string) => ({
        target: p
      })),
      abi: abi.underlyingToken,
      chain,
      block
    })
  ]);

  let coinsData: Read[];
  let underlyingBalances: Result[];
  [coinsData, { output: underlyingBalances }] = await Promise.all([
    getTokenAndRedirectData(
      underlyingTokens.map((t: Result) => t.output.toLowerCase()),
      chain,
      timestamp
    ),
    multiCall({
      calls: poolAddresses.map((p: string, i) => ({
        target: underlyingTokens[i].output,
        params: p
      })),
      abi: "erc20:balanceOf",
      chain,
      block
    })
  ]);

  return formWrites(
    underlyingBalances,
    coinsData,
    lpTokenInfo,
    chain,
    timestamp
  );
}
export default async function getTokenPrices(timestamp: number) {
  const chain: any = "avax";
  const block: number | undefined = await getBlock("avax", timestamp);
  let writes: Write[] = [];
  for (let factory of Object.entries(abi.poolInfo)) {
    console.log(writes.length);
    writes.push(
      ...(await getTokensFromFactory(
        timestamp,
        block,
        chain,
        factory[0],
        factory[1]
      ))
    );
  }
  return writes;
}
