import { multiCall, call } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
  isConfidencePriority
} from "../../utils/database";
import { getLPInfo } from "../../utils/erc20";
import { Write, Read } from "../../utils/dbInterfaces";
import { MultiCallResults, TokenInfos } from "../../utils/sdkInterfaces";
import { request, gql } from "graphql-request";
import getBlock from "../../utils/block";
import { BigNumber } from "ethers";

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
    block,
    requery: true
  });

  return pairs.output.map((result) => result.output.toLowerCase());
}
async function fetchUniV2MarketsFromSubgraph(
  subgraph: string,
  timestamp: number
) {
  let addresses: string[] = [];
  let reservereThreshold: number = 0;
  for (let i = 0; i < 5; i++) {
    const lpQuery = gql`
      query lps {
        pairs(first: 1000, orderBy: volumeUSD, orderDirection: desc,
          where: {${i == 0 ? `` : `volumeUSD_lt: ${reservereThreshold}`}
          ${timestamp == 0 ? `` : `timestamp_lt: ${timestamp.toString()}`}
        }) {
          id
          volumeUSD
        }
      }`;
    const result = (await request(subgraph, lpQuery)).pairs;
    if (result.length < 1000) i = 5;
    reservereThreshold = result[result.length - 1].volumeUSD;
    addresses.push(
      ...(await request(subgraph, lpQuery)).pairs.map((p: any) => p.id)
    );
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
      block,
      requery: true
    }),
    multiCall({
      abi: abi.token1,
      chain: chain as any,
      calls: pairAddresses.map((pairAddress) => ({
        target: pairAddress
      })),
      block,
      requery: true
    }),
    multiCall({
      abi: abi.getReserves,
      chain: chain as any,
      calls: pairAddresses.map((pairAddress) => ({
        target: pairAddress
      })),
      block,
      requery: true
    })
  ]);

  return [token0s, token1s, reserves];
}
async function findPriceableLPs(
  pairAddresses: string[],
  token0s: MultiCallResults,
  token1s: MultiCallResults,
  reserves: MultiCallResults,
  tokenPrices: Read[]
) {
  const priceableLPs: any = []; // lp : underlying
  for (let i = 0; i < pairAddresses.length; i++) {
    const pricedTokens = tokenPrices.map((t) =>
      t.dbEntry.PK.substring(t.dbEntry.PK.indexOf(":") + 1)
    );
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
export default async function getPairPrices(
  chain: string,
  factory: string,
  subgraph: string | undefined = undefined,
  timestamp: number
) {
  let token0s;
  let token1s;
  let reserves;
  let pairAddresses: string[];

  const block: number | undefined = await getBlock(chain, timestamp);
  if (chain == "bsc" && subgraph == undefined) {
    return;
  } else if (chain == "bsc" && subgraph != undefined) {
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
    timestamp
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
  // await unknownTokens(
  //   writes,
  //   chain,
  //   timestamp,
  //   priceableLPs,
  //   tokenPrices,
  //   tokenInfos
  // );
  await lps(writes, chain, timestamp, priceableLPs, tokenPrices, tokenInfos);

  return writes;
}
async function lps(
  writes: Write[],
  chain: string,
  timestamp: number,
  priceableLPs: any[],
  tokenPrices: any[],
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
    const coinData: Read = tokenPrices.filter((p: Read) =>
      p.dbEntry.PK.includes(l.primaryUnderlying.toLowerCase())
    )[0];

    let underlyingPrice: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].price
        : coinData.dbEntry.price;

    const supply =
      tokenInfos.supplies[i].output / 10 ** tokenInfos.lpDecimals[i].output;
    const value =
      (underlyingPrice * 2 * l.primaryBalance) /
      10 ** tokenInfos.underlyingDecimalAs[i].output;
    const lpPrice: number = value / supply;
    if (isNaN(lpPrice)) return;

    const symbol: string = `${tokenInfos.symbolAs[i].output}-${tokenInfos.symbolBs[i].output}-${tokenInfos.lpSymbols[i].output}`;

    let confidence: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].confidence
        : coinData.dbEntry.confidence;
    if (confidence == undefined) confidence = 1;

    if (symbol.includes("null")) return;
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
  timestamp: number,
  priceableLPs: any[],
  tokenPrices: any[],
  tokenInfos: TokenInfos
) {
  const lpsWithUnknown = priceableLPs.filter(
    (p: any) => p.bothTokensKnown == false
  );
  let tokenValues = lpsWithUnknown.map((l: any) => {
    const coinData: Read = tokenPrices.filter((p: Read) =>
      p.dbEntry.PK.includes(l.primaryUnderlying.toLowerCase())
    )[0];

    const i = priceableLPs.indexOf(l);
    let underlyingPrice: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].price
        : coinData.dbEntry.price;

    const sideValue =
      (underlyingPrice * l.primaryBalance) /
      10 ** tokenInfos.underlyingDecimalAs[i].output;

    const tokenValue =
      (sideValue * 10 ** tokenInfos.underlyingDecimalBs[i].output) /
      l.secondaryBalance;

    return tokenValue;
  });

  const confidences = await getConfidenceScores(
    lpsWithUnknown,
    "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    tokenValues,
    tokenInfos
  );

  const isPriority = await isConfidencePriority(
    confidences,
    lpsWithUnknown.map((l: any) => l.secondaryUnderlying),
    chain,
    timestamp
  );

  lpsWithUnknown.map((l: any, i: number) => {
    const j = priceableLPs.indexOf(l);
    if (!isPriority[i] || confidences[i] == 0) return;
    addToDBWritesList(
      writes,
      chain,
      l.secondaryUnderlying.toLowerCase(),
      tokenValues[i],
      tokenInfos.underlyingDecimalBs[j].output,
      `${tokenInfos.symbolBs[j].output}`,
      timestamp,
      "uniswap-unknown-token",
      confidences[i]
    );
  });
}
async function getConfidenceScores(
  lpsWithUnknown: any[],
  target: string,
  tokenValues: any[],
  tokenInfos: TokenInfos
) {
  const usdSwapSize = 5 * 10 ** 5;
  const calls = lpsWithUnknown
    .map((l: any, i: number) => {
      if (
        isNaN(
          10 ** tokenInfos.underlyingDecimalBs[i].output /
            tokenValues[i].toFixed()
        )
      )
        return [];
      // this just swaps 50k tokens cos I cant get the fuckin big numbers to work
      let qty = BigNumber.from(tokenInfos.underlyingDecimalBs[i].output).mul(
        usdSwapSize.toFixed()
      );
      return [
        {
          target,
          params: [qty, l.primaryBalance, l.secondaryBalance] // should be qty, reserveIn, reserveOut
        },
        {
          target,
          params: [qty.div(100), l.primaryBalance, l.secondaryBalance]
        }
      ];
    })
    .flat()
    .filter((c: any) => c != []);

  let a = await multiCall({
    abi: abi.getAmountIn,
    chain: "ethereum",
    calls
  }); // a is quant out from 50k unit swap
  let b = await multiCall({
    abi: abi.getAmountOut,
    chain: "ethereum",
    calls: calls as any
  }); // a is quant out from 50k unit swap

  return [0, 1];
}
// getPairPrices(
//   "ethereum",
//   "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
//   undefined,
//   0
// );
// ts-node coins/src/adapters/lps/uniswap/uniswap.ts
