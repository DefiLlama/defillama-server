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
import { utils, Contract, providers, BigNumber } from "ethers";
import { ParamType } from "ethers/lib/utils";
import { PromisePool } from "@supercharge/promise-pool";
import { getCurrentUnixTimestamp } from "../../../utils/date";

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

  console.log(pairsLength);
  const pairNums: number[] = Array.from(
    Array(Number(pairsLength)).keys()
  ).slice(87000);

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
        pricedTokens.includes(token1s.output[i].output.toLowerCase())
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

  const tokenInfos: TokenInfos = await getLPInfo(chain, priceableLPs, block);

  const writes: Write[] = [];
  await unknownTokens(
    writes,
    chain,
    timestamp,
    priceableLPs,
    tokenPrices,
    tokenInfos
  );
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

    const symbol: string = `${tokenInfos.symbolAs[i].output}-${tokenInfos.symbolBs[i].output}-${tokenInfos.lpSymbol[i].output}`;

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
  const deadline = getCurrentUnixTimestamp() + 3600;
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
      let qty = BigNumber.from("1");
      try {
        let qty = BigNumber.from(
          (
            (usdSwapSize * 10 ** tokenInfos.underlyingDecimalBs[i].output) /
            tokenValues[i]
          ).toFixed()
        );
        // let a = BigNumber.from(
        //   (
        //     usdSwapSize *
        //     10 ** (2 * tokenInfos.underlyingDecimalBs[i].output)
        //   ).toFixed()
        // );

        // let j = BigNumber.from(
        //   (
        //     tokenValues[i] *
        //     10 ** tokenInfos.underlyingDecimalBs[i].output
        //   ).toFixed()
        // );
        // qty = a.div(j);
      } catch (e) {
        console.log("here");
      }
      return [
        {
          target,
          params: [
            qty,
            0,
            [l.address],
            "0x0000E0Ca771e21bD00057F54A68C30D400000000",
            deadline
          ]
        },
        {
          target,
          params: [
            qty.div(100),
            0,
            [l.address],
            "0x0000E0Ca771e21bD00057F54A68C30D400000000",
            deadline
          ]
        }
      ];
    })
    .flat()
    .filter((c: any) => c != []); // [amntIn, minOut, path, to, deadline]
  let a = await multiCall2({
    abi: {
      inputs: [
        { internalType: "uint256", name: "amountIn", type: "uint256" },
        { internalType: "uint256", name: "amountOutMin", type: "uint256" },
        { internalType: "address[]", name: "path", type: "address[]" },
        { internalType: "address", name: "to", type: "address" },
        { internalType: "uint256", name: "deadline", type: "uint256" }
      ],
      name: "swapExactTokensForTokens",
      outputs: [
        { internalType: "uint256[]", name: "amounts", type: "uint256[]" }
      ],
      stateMutability: "nonpayable",
      type: "function"
    },
    chain: "ethereum",
    calls
  });
  return [0, 1];
  // target router with a static multicall
}
getPairPrices(
  "ethereum",
  "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  undefined,
  0
);
// ts-node coins/src/adapters/lps/uniswap/uniswap.ts

type CallParams = string | number | (string | number)[] | undefined;
function normalizeParams(params: CallParams): (string | number)[] {
  if (params === undefined) {
    return [];
  } else if (typeof params === "object") {
    return params;
  } else {
    return [params];
  }
}
async function multiCall2(params: {
  abi: string | any;
  calls: {
    target: string;
    params?: any;
  }[];
  block?: number;
  target?: string; // Used when calls.target is not provided
  chain?: string;
  requery?: boolean;
}) {
  const abi = params.abi;
  const contractCalls = params.calls.map((call) => {
    const callParams = normalizeParams(call.params);
    return {
      params: callParams,
      contract: call.target ?? params.target
    };
  });
  // Only a max of around 500 calls are supported by multicall, we have to split bigger batches
  const chunkSize = 500;
  const contractChunks = [];
  for (let i = 0; i < contractCalls.length; i += chunkSize)
    contractChunks.push(contractCalls.slice(i, i + chunkSize));

  const { results, errors } = await PromisePool.for(contractChunks)
    //.withConcurrency(20)
    .process(async (calls, i) =>
      makeMultiCall(abi, calls).then((calls) => [calls, i])
    );

  if (errors.length) throw errors[0];
}
async function makeMultiCall(
  functionABI: any,
  calls: {
    contract: string;
    params: any[];
  }[]
) {
  let contractInterface: any = new utils.Interface([functionABI]);
  let fd = Object.values(contractInterface.functions)[0];

  const contractCalls = calls.map((call) => {
    const data = contractInterface.encodeFunctionData(fd, call.params);
    return {
      to: call.contract,
      data
    };
  });

  const returnValues = await executeCalls(contractCalls);

  return returnValues;
}
async function executeCalls(
  contractCalls: {
    to: string;
    data: string;
  }[]
) {
  try {
    const multicallData = utils.defaultAbiCoder.encode(
      [
        ParamType.fromObject({
          components: [
            { name: "target", type: "address" },
            { name: "callData", type: "bytes" }
          ],
          name: "data",
          type: "tuple[]"
        })
      ],
      [contractCalls.map((call) => [call.to, call.data])]
    );
    const address = "0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441";
    const provider = new providers.JsonRpcProvider(
      "https://api.avax-test.network/ext/bc/C/rpc"
    );
    const abi = [
      {
        constant: false,
        inputs: [
          {
            components: [
              { name: "target", type: "address" },
              { name: "callData", type: "bytes" }
            ],
            name: "calls",
            type: "tuple[]"
          }
        ],
        name: "aggregate",
        outputs: [
          { name: "blockNumber", type: "uint256" },
          { name: "returnData", type: "bytes[]" }
        ],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      }
    ];
    let multicallInstance = new Contract(address, abi, provider);

    // hERE

    let result = await multicallInstance.callStatic.aggregate(multicallData);
    return result;
  } catch (e) {
    if (!process.env.DEFILLAMA_SDK_MUTED) {
      console.log("Multicall failed, defaulting to single transactions...");
    }
  }
}
