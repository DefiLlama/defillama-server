import { multiCall, call } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getLPInfo } from "../../utils/erc20";
import { write, read } from "../../utils/dbInterfaces";
import { multiCallResults } from "../../utils/sdkInterfaces";
import { request, gql } from "graphql-request";
import getBlock from "../../utils/block";

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

  const pairs: multiCallResults = await multiCall({
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
  let token0s: multiCallResults;
  let token1s: multiCallResults;
  let reserves: multiCallResults;
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
  token0s: multiCallResults,
  token1s: multiCallResults,
  reserves: multiCallResults,
  tokenPrices: read[]
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
    let token1 = false;
    if (pricedTokens.includes(token1s.output[i].output)) {
      token1 = true;
    }

    priceableLPs.push({
      address: pairAddresses[i],
      primaryUnderlying: token1
        ? token1s.output[i].output.toLowerCase()
        : token0s.output[i].output.toLowerCase(),
      secondaryUnderlying: token1
        ? token0s.output[i].output.toLowerCase()
        : token1s.output[i].output.toLowerCase(),
      underlyingBalance: token1
        ? reserves.output[i].output._reserve1
        : reserves.output[i].output._reserve0
    });
  }
  return priceableLPs;
}
export default async function getPairPrices(
  chain: string,
  factory: string,
  timestamp: number = 0,
  subgraph: string | undefined = undefined
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
    chain
  );

  const priceableLPs = await findPriceableLPs(
    pairAddresses,
    token0s,
    token1s,
    reserves,
    tokenPrices
  );

  const tokenInfo = await getLPInfo(chain, priceableLPs, block);

  const writes: write[] = [];
  priceableLPs.map((l: any, i: number) => {
    const coinData: read = tokenPrices.filter((p: read) =>
      p.dbEntry.PK.includes(l.primaryUnderlying.toLowerCase())
    )[0];

    let underlyingPrice: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].price
        : coinData.dbEntry.price;

    const supply =
      tokenInfo.supplies[i].output / 10 ** tokenInfo.lpDecimals[i].output;
    const value =
      (underlyingPrice * 2 * l.underlyingBalance) /
      10 ** tokenInfo.underlyingDecimals[i].output;
    const lpPrice: number = value / supply;

    const symbol: string = `${tokenInfo.symbolAs[i].output}-${tokenInfo.symbolBs[i].output}-${tokenInfo.lpSymbol[i].output}`;

    if (symbol.includes("null")) return;
    addToDBWritesList(
      writes,
      chain,
      l.address,
      lpPrice,
      tokenInfo.lpDecimals[i].output,
      symbol,
      timestamp
    );
  });

  return writes;
}
