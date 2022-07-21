import { multiCall, call } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getLPInfo } from "../../utils/erc20";
import { write, read } from "../../utils/dbInterfaces";
import { multiCallResults } from "../../utils/sdkInterfaces";
import { requery } from "../../utils/sdk";
import { request, gql } from "graphql-request";

async function fetchUniV2Markets(chain: string, factory: string) {
  let pairsLength: string = (
    await call({
      target: factory,
      chain: chain as any,
      abi: abi.allPairsLength
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
    requery: true
  });

  return pairs.output.map((result) => result.output.toLowerCase());
}
async function fetchUniV2MarketsFromSubgraph(subgraph: string) {
  let addresses: string[] = [];
  let reservereThreshold: number = 0;
  for (let i = 0; i < 5; i++) {
    const lpQuery = gql`
      query lps {
        pairs(first: 1000, orderBy: reserveUSD, orderDirection: desc ${
          i == 0
            ? ``
            : `,         
          where: {
            reserveUSD_lt: ${reservereThreshold}
          }`
        }) {
          id
          reserveUSD
        }
      }`;
    const result = (await request(subgraph, lpQuery)).pairs;
    reservereThreshold = result[999].reserveUSD;
    addresses.push(
      ...(await request(subgraph, lpQuery)).pairs.map((p: any) => p.id)
    );
  }
  return addresses;
}
async function fetchUniV2MarketData(chain: string, pairAddresses: string[]) {
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
      requery: true
    }),
    multiCall({
      abi: abi.token1,
      chain: chain as any,
      calls: pairAddresses.map((pairAddress) => ({
        target: pairAddress
      })),
      requery: true
    }),
    multiCall({
      abi: abi.getReserves,
      chain: chain as any,
      calls: pairAddresses.map((pairAddress) => ({
        target: pairAddress
      })),
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
        ? reserves.output[i].output._reserve0
        : reserves.output[i].output._reserve1
    });
  }
  return priceableLPs;
}
export default async function getPairPrices(
  chain: string,
  factory: string,
  subgraph: string | undefined = undefined
) {
  let token0s;
  let token1s;
  let reserves;
  let pairAddresses: string[];

  if (chain == "bsc" && subgraph == undefined) {
    return;
  } else if (chain == "bsc" && subgraph != undefined) {
    pairAddresses = await fetchUniV2MarketsFromSubgraph(subgraph);
  } else {
    pairAddresses = await fetchUniV2Markets(chain, factory);
  }

  [token0s, token1s, reserves] = await fetchUniV2MarketData(
    chain,
    pairAddresses
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

  const tokenInfo = await getLPInfo(chain, priceableLPs);

  const writes: write[] = [];
  priceableLPs.map((l: any, i: number) => {
    const coinData: read = tokenPrices.filter((p: read) =>
      p.dbEntry.PK.includes(l.primaryUnderlying.toLowerCase())
    )[0];

    let underlyingPrice: number =
      coinData.redirect.length != 0
        ? coinData.redirect[0].price
        : coinData.dbEntry.price;

    const lpPrice: number =
      (underlyingPrice *
        2 *
        l.underlyingBalance *
        10 ** tokenInfo.underlyingDecimals[i].output) /
      (tokenInfo.supplies[i].output * 10 ** tokenInfo.lpDecimals[i].output);

    const symbol: string = `${tokenInfo.symbolAs[i].output}-${tokenInfo.symbolBs[i].output}-${tokenInfo.lpSymbol[i].output}`;
    if (symbol.includes("null")) return;
    addToDBWritesList(
      writes,
      chain,
      l.address,
      lpPrice,
      tokenInfo.lpDecimals[i].output,
      symbol
    );
  });

  return writes;
}
