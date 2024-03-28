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
  };
};
type Call = {
  target?: string;
  params?: any;
};

const chain: any = "ethereum";
const fees: string[] = ["10000", "3000", "500", "100"];
const sqrtPriceLimitX96 = "0";
const dollarAmt = 10 ** 5;
const contracts: any = {
  ethereum: {
    quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    tokenOut: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  },
};

async function estimateValuesAndFetchMetadata(
  tokensIn: string[],
  block: number | undefined,
): Promise<Data> {
  // first, estimate the value of the token by swapping 1 USDC for x tokens
  const estimateCalls = tokensIn
    .map((t: string) =>
      fees.map((f: string) => ({
        target: contracts[chain].quoter,
        params: [
          [
            contracts[chain].tokenOut,
            t,
            sdk.util.convertToBigInt(1e6).toString(),
            f,
            sqrtPriceLimitX96,
          ],
        ],
      })),
    )
    .flat();

  let data: Data = {};
  [...tokensIn, contracts[chain].tokenOut].map((t: string) => {
    data[t] = {
      rawQty: -1,
      decimals: -1,
      symbol: "",
      priceEstimate: -1,
      largeRate: -1,
      smallRate: -1,
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
      calls: [...tokensIn, contracts[chain].tokenOut].map((target: string) => ({
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
      calls: tokensIn.map((target: string) => ({ target })),
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
function createMainQuoterCalls(data: Data): Call[] {
  const calls: Call[] = [];
  Object.keys(data).map((t: string) => {
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
            target: contracts[chain].quoter,
            params: [
              [
                t,
                contracts[chain].tokenOut,
                sdk.util.convertToBigInt(largeQty).toString(),
                sdk.util.convertToBigInt(f).toString(),
                sqrtPriceLimitX96,
              ],
            ],
          },
          {
            target: contracts[chain].quoter,
            params: [
              [
                t,
                contracts[chain].tokenOut,
                sdk.util.convertToBigInt(Number(+largeQty /dollarAmt).toFixed(0)).toString(),
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
      if (!r.output) return;
      const rate =
        r.input.params[0][2].toString() /
        (r.output.amountOut *
          10 **
            (data[token].decimals - data[contracts[chain].tokenOut].decimals));
      if (i % 2 == 0) {
        if (i % 2 == 0 && r.output.amountOut > data[token].largeRate)
          data[token].largeRate = rate;
      } else if (r.output.amountOut > data[token].smallRate)
        data[token].smallRate = rate;
    }),
  );
}
export async function findPricesThroughV3(
  tokensIn: string[],
  timestamp: number = 0,
) {
  const block = await getBlock(chain, timestamp);

  const data = await estimateValuesAndFetchMetadata(tokensIn, block);
  Object.keys(data).map((a: string) => {
    data[a].priceEstimate = 10 ** data[a].decimals / data[a].rawQty;
  });

  const calls: Call[] = createMainQuoterCalls(data);

  await fetchSwapQuotes(calls, data, block);
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
