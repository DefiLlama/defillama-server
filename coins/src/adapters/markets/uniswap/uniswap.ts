import { multiCall, call } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getLPInfo } from "../../utils/erc20";
import { Write, Read, CoinData } from "../../utils/dbInterfaces";
import { MultiCallResults, TokenInfos } from "../../utils/sdkInterfaces";
import { request, gql } from "graphql-request";
import getBlock from "../../utils/block";
import * as sdk from "@defillama/sdk";

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

async function fetchUniV2Markets(
  chain: string,
  factory: string,
  block: number | undefined,
  poolsAbi: boolean,
) {
  let pairsLength: string = (
    await call({
      target: factory,
      chain: chain as any,
      abi: poolsAbi ? abi.allPoolsLength : abi.allPairsLength,
      block,
    })
  ).output;

  const pairNums: number[] = Array.from(Array(Number(pairsLength)).keys());

  const pairs: MultiCallResults = await multiCall({
    abi: poolsAbi ? abi.allPools : abi.allPairs,
    chain: chain as any,
    calls: pairNums.map((num) => ({
      target: factory,
      params: [num],
    })),
    block,
  });

  return pairs.output.map((result) => result.output.toLowerCase());
}
async function fetchUniV2MarketsFromSubgraph(
  subgraph: string,
  timestamp: number,
) {
  let addresses: string[] = [];
  let reservereThreshold: Number = 0;
  for (let i = 0; i < 10; i++) {
    const lpQuery = gql`
      query lps {
        pairs(first: 1000, orderBy: trackedReserveETH, orderDirection: desc,
          where: {${
            i == 0
              ? ``
              : `trackedReserveETH_lt: ${Number(reservereThreshold).toFixed(4)}`
          }
          ${
            timestamp == 0
              ? ``
              : `createdAtTimestamp_gt: ${timestamp.toString()}`
          }
        }) {
          id
          trackedReserveETH
        }
      }`;
    const res: any = await request(subgraph, lpQuery);
    const pairs = res.pairs;
    if (pairs.length < 1000) i = 20;
    if (pairs.length == 0) return addresses;
    reservereThreshold = pairs[Math.max(pairs.length - 1, 0)].trackedReserveETH;
    addresses.push(...pairs.map((p: any) => p.id));
    sleep(5000);
  }
  return addresses;
}
async function fetchUniV2MarketData(
  chain: string,
  pairAddresses: string[],
  block: number | undefined,
) {
  let token0s: MultiCallResults;
  let token1s: MultiCallResults;
  let reserves: MultiCallResults;
  token0s = await multiCall({
    abi: abi.token0,
    chain: chain as any,
    calls: pairAddresses.map((pairAddress) => ({
      target: pairAddress,
    })),
    block,
    permitFailure: true,
  });
  token1s = await multiCall({
    abi: abi.token1,
    chain: chain as any,
    calls: pairAddresses.map((pairAddress) => ({
      target: pairAddress,
    })),
    block,
    permitFailure: true,
  });
  reserves = await multiCall({
    abi: abi.getReserves,
    chain: chain as any,
    calls: pairAddresses.map((pairAddress) => ({
      target: pairAddress,
    })),
    block,
    permitFailure: true,
  });
  return [token0s, token1s, reserves];
}
async function findPriceableLPs(
  pairAddresses: string[],
  token0s: MultiCallResults,
  token1s: MultiCallResults,
  reserves: MultiCallResults,
  tokenPrices: CoinData[],
) {
  const priceableLPs: any = []; // lp : underlying
  for (let i = 0; i < pairAddresses.length; i++) {
    const pricedTokens = tokenPrices.map((t) => t.address);
    if (
      !pricedTokens.includes(token0s.output[i].output.toLowerCase()) &&
      !pricedTokens.includes(token1s.output[i].output.toLowerCase())
    )
      continue;

    let token1Known = false;
    if (pricedTokens.includes(token1s.output[i].output.toLowerCase())) {
      token1Known = true;
    }

    priceableLPs.push({
      address: pairAddresses[i],
      primaryUnderlying: token1Known
        ? token1s.output[i].output.toLowerCase()
        : token0s.output[i].output.toLowerCase(),
      secondaryUnderlying: token1Known
        ? token0s.output[i].output.toLowerCase()
        : token1s.output[i].output.toLowerCase(),
      primaryBalance: token1Known
        ? reserves.output[i].output._reserve1
        : reserves.output[i].output._reserve0,
      secondaryBalance: token1Known
        ? reserves.output[i].output._reserve0
        : reserves.output[i].output._reserve1,
      bothTokensKnown:
        pricedTokens.includes(token0s.output[i].output.toLowerCase()) &&
        pricedTokens.includes(token1s.output[i].output.toLowerCase()),
      token1Primary: token1Known,
    });
  }
  return priceableLPs;
}
async function lps(
  writes: Write[],
  chain: string,
  timestamp: number,
  priceableLPs: any[],
  tokenPrices: CoinData[],
  tokenInfos: TokenInfos,
) {
  priceableLPs.map(async (l: any, i: number) => {
    if (
      [
        tokenInfos.lpDecimals[i].output,
        tokenInfos.lpSymbols[i].output,
        tokenInfos.supplies[i].output,
        tokenInfos.symbolAs[i].output,
        tokenInfos.symbolBs[i].output,
        tokenInfos.underlyingDecimalAs[i].output,
        tokenInfos.underlyingDecimalBs[i].output,
      ].some((e) => e == null || e == undefined)
    ) {
      return;
    }
    const coinData: CoinData | undefined = tokenPrices.find(
      (p: CoinData) => p.address == l.primaryUnderlying.toLowerCase(),
    );
    if (coinData == undefined) return;
    const supply =
      tokenInfos.supplies[i].output / 10 ** tokenInfos.lpDecimals[i].output;
    const value =
      (coinData.price * 2 * l.primaryBalance) /
      10 ** tokenInfos.underlyingDecimalAs[i].output;
    if (value < 400) return;
    const lpPrice: number = value / supply;
    if (isNaN(lpPrice)) return;

    const symbol: string = `${tokenInfos.symbolAs[i].output}-${tokenInfos.symbolBs[i].output}-${tokenInfos.lpSymbols[i].output}`;

    let confidence: number =
      coinData.confidence == undefined ? 1 : coinData.confidence;

    if (symbol.includes("null") || lpPrice == Infinity) return;
    addToDBWritesList(
      writes,
      chain,
      l.address,
      lpPrice,
      tokenInfos.lpDecimals[i].output,
      symbol,
      timestamp,
      "uniswap-LP",
      confidence,
    );
  });
}
async function unknownTokens(
  writes: Write[],
  chain: string,
  router: string | undefined,
  timestamp: number,
  priceableLPs: any[],
  tokenPrices: CoinData[],
  tokenInfos: TokenInfos,
  poolsAbi: boolean,
  factory: string,
) {
  if (router == undefined) return;
  const lpsWithUnknown = priceableLPs.filter(
    (p: any) => p.bothTokensKnown == false,
  );
  let tokenValues = lpsWithUnknown.map((l: any) => {
    const coinData: CoinData | undefined = tokenPrices.find(
      (p: CoinData) => p.address == l.primaryUnderlying.toLowerCase(),
    );
    if (coinData == undefined) return;
    const i: number = priceableLPs.indexOf(l);

    const sideValue: number =
      (coinData.price * l.primaryBalance) /
      10 ** tokenInfos.underlyingDecimalAs[i].output;

    const tokenValue: number =
      (sideValue * 10 ** tokenInfos.underlyingDecimalBs[i].output) /
      l.secondaryBalance;

    return tokenValue;
  });

  const confidences: { [address: string]: number } = await getConfidenceScores(
    lpsWithUnknown,
    priceableLPs,
    router,
    tokenValues,
    tokenInfos,
    chain,
    poolsAbi,
    factory,
  );

  lpsWithUnknown.map((l: any, i: number) => {
    if (isNaN(confidences[l.secondaryUnderlying.toLowerCase()])) return;
    const j: number = priceableLPs.indexOf(l);

    addToDBWritesList(
      writes,
      chain,
      l.secondaryUnderlying.toLowerCase(),
      tokenValues[i],
      tokenInfos.underlyingDecimalBs[j].output,
      `${tokenInfos.symbolBs[j].output}`,
      timestamp,
      "uniswap-unknown-token",
      confidences[l.secondaryUnderlying.toLowerCase()],
    );
  });
}
export function translateQty(
  usdSwapSize: number,
  decimals: number,
  tokenValue: number,
) {
  const bigInt = sdk.util.convertToBigInt(
    Number((usdSwapSize * 10 ** decimals) / tokenValue).toFixed(0),
  );
  return bigInt.toString();
}
async function getConfidenceScores(
  lpsWithUnknown: any[],
  priceableLPs: any[],
  target: string,
  tokenValues: any[],
  tokenInfos: TokenInfos,
  chain: string,
  poolsAbi: boolean,
  factory: string,
) {
  const usdSwapSize: number = 10 ** 5;
  const ratio: number = 10000;
  const calls = lpsWithUnknown
    .map((l: any, i: number) => {
      const j = priceableLPs.indexOf(l);
      const swapSize =
        10 ** tokenInfos.underlyingDecimalBs[j].output / tokenValues[i];
      if (isNaN(swapSize) || !isFinite(swapSize)) return [];

      const qty: string | undefined = translateQty(
        usdSwapSize,
        tokenInfos.underlyingDecimalBs[j].output,
        tokenValues[i],
      );
      if (qty == undefined) return [];
      const route = poolsAbi
        ? [[l.secondaryUnderlying, l.primaryUnderlying, false, factory]]
        : [l.secondaryUnderlying, l.primaryUnderlying];

      return [
        {
          target,
          params: [qty, route],
        },
        {
          target,
          params: [
            sdk.util
              .convertToBigInt(Number(+qty / ratio).toFixed(0))
              .toString(),
            route,
          ],
        },
      ];
    })
    .flat();

  const { output: swapResults }: MultiCallResults = await multiCall({
    abi: poolsAbi ? abi.getAmountsOut2 : abi.getAmountsOut,
    chain: chain as any,
    calls: calls as any,
    permitFailure: true,
  });

  const confidences: { [address: string]: number } = {};
  swapResults.map((r: any, i: number) => {
    if (i % 2 != 0) return;
    let confidence: number = 0;
    try {
      confidence = r.output[1] / (ratio * swapResults[i + 1].output[1]);
      if (confidence > 0.989) confidence = 0.989;
    } catch {}
    const queryAddress = poolsAbi
      ? r.input.params[1][0][0].toLowerCase()
      : r.input.params[1][0].toLowerCase();
    confidences[queryAddress] = confidence;
  });
  return confidences;
}
export default async function getTokenPrices(
  chain: string,
  factory: string,
  router: string | undefined,
  subgraph: string | undefined = undefined,
  timestamp: number,
  poolsAbi: boolean = false,
) {
  router;
  let token0s;
  let token1s;
  let reserves;
  let pairAddresses: string[];

  const block: number | undefined = await getBlock(chain, timestamp);
  if (subgraph != undefined) {
    pairAddresses = await fetchUniV2MarketsFromSubgraph(subgraph, timestamp);
  } else {
    pairAddresses = await fetchUniV2Markets(chain, factory, block, poolsAbi);
  }

  [token0s, token1s, reserves] = await fetchUniV2MarketData(
    chain,
    pairAddresses,
    block,
  );

  const underlyingTokens = [
    ...new Set<string>([
      ...token0s.output.map((t) => t.output.toLowerCase()),
      ...token1s.output.map((t) => t.output.toLowerCase()),
    ]),
  ];

  const tokenPrices = await getTokenAndRedirectData(
    Array.from(underlyingTokens),
    chain,
    timestamp,
    12,
  );

  const priceableLPs = await findPriceableLPs(
    pairAddresses,
    token0s,
    token1s,
    reserves,
    tokenPrices,
  );

  const tokenInfos: TokenInfos = (await getLPInfo(
    chain,
    priceableLPs,
    block,
  )) as TokenInfos;

  const writes: Write[] = [];
  await unknownTokens(
    writes,
    chain,
    router,
    timestamp,
    priceableLPs,
    tokenPrices,
    tokenInfos,
    poolsAbi,
    factory,
  );
  await lps(writes, chain, timestamp, priceableLPs, tokenPrices, tokenInfos);

  return writes;
}
