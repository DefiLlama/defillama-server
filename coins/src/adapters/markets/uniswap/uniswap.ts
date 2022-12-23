import { multiCall, call } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getLPInfo } from "../../utils/erc20";
import { Write, Read, CoinData } from "../../utils/dbInterfaces";
import { MultiCallResults, TokenInfos } from "../../utils/sdkInterfaces";
import { request, gql } from "graphql-request";
import getBlock from "../../utils/block";
import { BigNumber } from "ethers";

const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

async function fetchUniV2Markets(
  chain: string,
  factory: string,
  block: number | undefined
) {
  let pairsLength: string = (
    await call({
      target: factory,
      chain: chain as any,
      abi: abi.allPairsLength,
      block
    })
  ).output;

  const pairNums: number[] = Array.from(Array(Number(pairsLength)).keys());

  const pairs: MultiCallResults = await multiCall({
    abi: abi.allPairs,
    chain: chain as any,
    calls: pairNums.map((num) => ({
      target: factory,
      params: [num]
    })),
    block
  });

  return pairs.output.map((result) => result.output.toLowerCase());
}
async function fetchUniV2MarketsFromSubgraph(
  subgraph: string,
  timestamp: number
) {
  let addresses: string[] = [];
  let reservereThreshold: Number = 0;
  for (let i = 0; i < 20; i++) {
    const lpQuery = gql`
      query lps {
        pairs(first: 1000, orderBy: volumeUSD, orderDirection: desc,
          where: {${
            i == 0
              ? ``
              : `volumeUSD_lt: ${Number(reservereThreshold).toFixed(4)}`
          }
          ${
            timestamp == 0
              ? ``
              : `createdAtTimestamp_gt: ${(timestamp * 1000).toString()}`
          }
        }) {
          id
          volumeUSD
        }
      }`;
    const result = (await request(subgraph, lpQuery)).pairs;
    if (result.length < 1000) i = 20;
    if (result.length == 0) return addresses;
    reservereThreshold = result[Math.max(result.length - 1, 0)].volumeUSD;
    addresses.push(...result.map((p: any) => p.id));
    sleep(500);
  }
  return addresses;
}
async function fetchUniV2MarketData(
  chain: string,
  pairAddresses: string[],
  block: number | undefined
) {
  let token0s: MultiCallResults;
  let token1s: MultiCallResults;
  let reserves: MultiCallResults;
  [token0s, token1s, reserves] = await Promise.all([
    multiCall({
      abi: abi.token0,
      chain: chain as any,
      calls: pairAddresses.map((pairAddress) => ({
        target: pairAddress
      })),
      block
    }),
    multiCall({
      abi: abi.token1,
      chain: chain as any,
      calls: pairAddresses.map((pairAddress) => ({
        target: pairAddress
      })),
      block
    }),
    multiCall({
      abi: abi.getReserves,
      chain: chain as any,
      calls: pairAddresses.map((pairAddress) => ({
        target: pairAddress
      })),
      block
    })
  ]);

  return [token0s, token1s, reserves];
}
async function findPriceableLPs(
  pairAddresses: string[],
  token0s: MultiCallResults,
  token1s: MultiCallResults,
  reserves: MultiCallResults,
  tokenPrices: CoinData[]
) {
  const priceableLPs: any = []; // lp : underlying
  for (let i = 0; i < pairAddresses.length; i++) {
    const pricedTokens = tokenPrices.map((t) => t.address);
    if (
      !pricedTokens.includes(
        token0s.output[i].output.toLowerCase() ||
          token1s.output[i].output.toLowerCase()
      )
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
      token1Primary: token1Known
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
  tokenInfos: TokenInfos
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
        tokenInfos.underlyingDecimalBs[i].output
      ].some((e) => e == null || e == undefined)
    ) {
      return;
    }
    const coinData: CoinData | undefined = tokenPrices.find(
      (p: CoinData) => p.address == l.primaryUnderlying.toLowerCase()
    );
    if (coinData == undefined) return;
    const supply =
      tokenInfos.supplies[i].output / 10 ** tokenInfos.lpDecimals[i].output;
    const value =
      (coinData.price * 2 * l.primaryBalance) /
      10 ** tokenInfos.underlyingDecimalAs[i].output;
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
      confidence
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
  tokenInfos: TokenInfos
) {
  if (router == undefined) return;
  const lpsWithUnknown = priceableLPs.filter(
    (p: any) => p.bothTokensKnown == false
  );
  let tokenValues = lpsWithUnknown.map((l: any) => {
    const coinData: CoinData | undefined = tokenPrices.find(
      (p: CoinData) => p.address == l.primaryUnderlying.toLowerCase()
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
    chain
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
      confidences[l.secondaryUnderlying.toLowerCase()]
    );
  });
}
function translateQty(
  usdSwapSize: number,
  decimals: number,
  tokenValue: number
) {
  const scientificNotation: string = (
    (usdSwapSize * 10 ** decimals) /
    tokenValue
  ).toString();
  if (scientificNotation.indexOf("e") == -1) {
    try {
      const qty: BigNumber = BigNumber.from(parseInt(scientificNotation));
      return qty;
    } catch {
      return;
    }
  }
  const power: string = scientificNotation.substring(
    scientificNotation.indexOf("e") + 2
  );
  const root: string = scientificNotation.substring(
    0,
    scientificNotation.indexOf("e")
  );

  const zerosToAppend: number = parseInt(power) - root.length + 2;
  let zerosString: string = "";
  for (let i = 0; i < zerosToAppend; i++) {
    zerosString = `${zerosString}0`;
  }

  return BigNumber.from(`${root.replace(/[.]/g, "")}${zerosString}`);
}
async function getConfidenceScores(
  lpsWithUnknown: any[],
  priceableLPs: any[],
  target: string,
  tokenValues: any[],
  tokenInfos: TokenInfos,
  chain: string
) {
  const usdSwapSize: number = 5 * 10 ** 5;
  const ratio: number = 10000;
  const calls = lpsWithUnknown
    .map((l: any, i: number) => {
      const j = priceableLPs.indexOf(l);
      const swapSize =
        10 ** tokenInfos.underlyingDecimalBs[j].output /
        tokenValues[i].toFixed();
      if (isNaN(swapSize) || !isFinite(swapSize)) return [];

      const qty: BigNumber | undefined = translateQty(
        usdSwapSize,
        tokenInfos.underlyingDecimalBs[j].output,
        tokenValues[i]
      );
      if (qty == undefined) return [];
      return [
        {
          target,
          params: [qty, [l.secondaryUnderlying, l.primaryUnderlying]]
        },
        {
          target,
          params: [qty.div(ratio), [l.secondaryUnderlying, l.primaryUnderlying]]
        }
      ];
    })
    .flat();

  const { output: swapResults }: MultiCallResults = await multiCall({
    abi: abi.getAmountsOut,
    chain: chain as any,
    calls: calls as any
  });

  const confidences: { [address: string]: number } = {};
  swapResults.map((r: any, i: number) => {
    if (i % 2 != 0) return;
    let confidence: number = 0;
    try {
      confidence = r.output[1] / (ratio * swapResults[i + 1].output[1]);
      if (confidence > 0.989) confidence = 0.989;
    } catch {}
    confidences[r.input.params[1][0].toLowerCase()] = confidence;
  });
  return confidences;
}
export default async function getTokenPrices(
  chain: string,
  factory: string,
  router: string | undefined,
  subgraph: string | undefined = undefined,
  timestamp: number
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
    pairAddresses = await fetchUniV2Markets(chain, factory, block);
  }

  [token0s, token1s, reserves] = await fetchUniV2MarketData(
    chain,
    pairAddresses,
    block
  );

  const underlyingTokens = [
    ...new Set<string>([
      ...token0s.output.map((t) => t.output.toLowerCase()),
      ...token1s.output.map((t) => t.output.toLowerCase())
    ])
  ];

  const tokenPrices = await getTokenAndRedirectData(
    Array.from(underlyingTokens),
    chain,
    timestamp,
    3
  );

  const priceableLPs = await findPriceableLPs(
    pairAddresses,
    token0s,
    token1s,
    reserves,
    tokenPrices
  );

  const tokenInfos: TokenInfos = await getLPInfo(
    chain,
    priceableLPs,
    block,
    false
  );

  const writes: Write[] = [];
  await unknownTokens(
    writes,
    chain,
    router,
    timestamp,
    priceableLPs,
    tokenPrices,
    tokenInfos
  );
  await lps(writes, chain, timestamp, priceableLPs, tokenPrices, tokenInfos);

  return writes;
}
