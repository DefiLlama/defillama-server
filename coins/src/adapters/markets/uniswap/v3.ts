import { multiCall } from "@defillama/sdk/build/abi";
import * as sdk from "@defillama/sdk";
import getBlock from "../../utils/block";
import { translateQty } from "./uniswap";
import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";
import abi from "./abi.json";

type Data = {
  [address: string]: {
    decimals: number;
    symbol: string;
    rawQty: number;
    priceEstimate: number;
    largeRate: number;
    smallRate: number;
    out: string;
  };
};
type Call = {
  target?: string;
  params?: any;
};
type Tokens = { in: string; out: string };
const fees: string[] = ["10000", "3000", "500", "100"];
const sqrtPriceLimitX96 = "0";
const dollarAmt = 10 ** 5;

const quoters: { [chain: string]: string } = {
  ethereum: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
};

async function estimateValuesAndFetchMetadata(
  chain: any,
  tokens: Tokens[],
  block: number | undefined,
): Promise<Data> {
  // first, estimate the value of the token by swapping 1 USDC for x tokens
  const estimateCalls = tokens
    .map((t: Tokens) =>
      fees.map((f: string) => ({
        target: quoters[chain],
        params: [
          [
            t.out.toLowerCase(),
            t.in.toLowerCase(),
            sdk.util.convertToBigInt(1e6).toString(),
            f,
            sqrtPriceLimitX96,
          ],
        ],
      })),
    )
    .flat();

  let data: Data = {};
  const tokensMap: { [input: string]: string } = {};
  tokens.map((t: Tokens) => {
    tokensMap[t.in.toLowerCase()] = t.out.toLowerCase();
  });
  const allTokens: string[] = [
    ...new Set(tokens.map((t: Tokens) => t.in.toLowerCase())),
    ...new Set(tokens.map((t: Tokens) => t.out.toLowerCase())),
  ];

  allTokens.map((t: string) => {
    data[t] = {
      rawQty: -1,
      decimals: -1,
      symbol: "",
      priceEstimate: -1,
      largeRate: -1,
      smallRate: -1,
      out: tokensMap[t] ?? "",
    };
  });

  await Promise.all([
    multiCall({
      calls: estimateCalls,
      abi: abi.quoteExactInputSingle,
      chain,
      block,
      permitFailure: true,
    }).then((res: any) =>
      res.output.map((r: any) => {
        const token = r.input.params[0][1];
        if (
          r.output &&
          data[token].rawQty != undefined &&
          r.output.amountOut > data[token].rawQty
        )
          data[token].rawQty = r.output.amountOut;
      }),
    ),
    multiCall({
      calls: allTokens.map((target: string) => ({
        target,
      })),
      abi: "erc20:decimals",
      chain,
      block,
    }).then((res: any) =>
      res.output.map((r: any) => {
        data[r.input.target].decimals = r.output;
      }),
    ),
    multiCall({
      calls: tokens.map((tokens: Tokens) => ({
        target: tokens.in.toLowerCase(),
      })),
      abi: "erc20:symbol",
      chain,
      block,
    }).then((res: any) =>
      res.output.map((r: any) => {
        data[r.input.target].symbol = r.output;
      }),
    ),
  ]);

  return data;
}
function createMainQuoterCalls(chain: any, data: Data): Call[] {
  const calls: Call[] = [];
  Object.keys(data).map((t: any) => {
    if (data[t].priceEstimate < 0) return;
    const largeQty = translateQty(
      dollarAmt,
      data[t].decimals,
      data[t].priceEstimate,
    );
    if (!largeQty) return;

    fees.map((f: string) => {
      calls.push(
        ...[
          {
            target: quoters[chain],
            params: [
              [
                t,
                data[t].out,
                sdk.util.convertToBigInt(largeQty).toString(),
                sdk.util.convertToBigInt(f).toString(),
                sqrtPriceLimitX96,
              ],
            ],
          },
          {
            target: quoters[chain],
            params: [
              [
                t,
                data[t].out,
                sdk.util
                  .convertToBigInt(Number(+largeQty / dollarAmt).toFixed(0))
                  .toString(),
                f,
                sqrtPriceLimitX96,
              ],
            ],
          },
        ],
      );
    });
  });

  return calls;
}
async function fetchSwapQuotes(
  chain: any,
  calls: Call[],
  data: Data,
  block: number | undefined,
): Promise<void> {
  // get quotes for token => stable swaps, effectively gives us the $ value of the token
  // low liq tokens will probably have a lower rate for large swaps
  await multiCall({
    calls,
    abi: abi.quoteExactInputSingle,
    chain,
    block,
    permitFailure: true,
  }).then((res: any) =>
    res.output.map((r: any, i: number) => {
      const token = r.input.params[0][0];
      let a = data[token];
      if (!r.output) return;
      const rate =
        r.input.params[0][2].toString() /
        (r.output.amountOut *
          10 ** (data[token].decimals - data[data[token].out].decimals));
      if (i % 2 == 0) {
        if (i % 2 == 0 && r.output.amountOut > data[token].largeRate)
          data[token].largeRate = rate;
      } else if (r.output.amountOut > data[token].smallRate)
        data[token].smallRate = rate;
    }),
  );
}
async function findPricesThroughV3(
  chain: any,
  tokens: Tokens[],
  timestamp: number,
) {
  const block = await getBlock(chain, timestamp);

  const data = await estimateValuesAndFetchMetadata(chain, tokens, block);
  Object.keys(data).map((a: string) => {
    data[a].priceEstimate = 10 ** data[a].decimals / data[a].rawQty;
  });

  const calls: Call[] = createMainQuoterCalls(chain, data);

  await fetchSwapQuotes(chain, calls, data, block);
  const writes: Write[] = [];

  Object.keys(data).map((t: string) => {
    const tokenData = data[t];
    if (
      Object.values(tokenData).includes("") ||
      Object.values(tokenData).includes(-1)
    )
      return;

    const confidence = Math.min(
      tokenData.largeRate / tokenData.smallRate,
      0.989,
    );

    addToDBWritesList(
      writes,
      chain,
      t,
      tokenData.smallRate,
      tokenData.decimals,
      tokenData.symbol,
      timestamp,
      "univ3",
      confidence,
    );
  });

  return writes;
}
export function uniV3(timestamp: number = 0) {
  return Promise.all([
    findPricesThroughV3(
      "ethereum",
      [
        {
          in: "0x7a486f809c952a6f8dec8cb0ff68173f2b8ed56c",
          out: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        },
      ],
      timestamp,
    ),
  ]);
}
