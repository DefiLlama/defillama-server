import { multiCall } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";
import getBlock from "../../utils/block";
import { translateQty } from "./uniswap";
const chain: any = "ethereum";
const contracts: any = {
  ethereum: { quoter: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e" },
};
const abi: any = {
  quoteExactInputSingle: {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
        ],
        internalType: "struct IQuoterV2.QuoteExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { internalType: "uint256", name: "amountOut", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceX96After", type: "uint160" },
      {
        internalType: "uint32",
        name: "initializedTicksCrossed",
        type: "uint32",
      },
      { internalType: "uint256", name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
};

async function main(tokensIn: string[], timestamp: number = 0) {
  const block = await getBlock(chain, timestamp);
  const tokenOut = "0xdac17f958d2ee523a2206206994597c13d831ec7"; //"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC
  const fees: string[] = ["10000", "3000", "500", "100"];
  const sqrtPriceLimitX96 = "0";
  const estimateCalls = tokensIn
    .map((t: string) =>
      fees.map((f: string) => ({
        target: contracts[chain].quoter,
        params: [
          [
            tokenOut,
            t,
            BigNumber.from(1e6).toString(),
            BigNumber.from(f).toString(),
            sqrtPriceLimitX96,
          ],
        ],
      })),
    )
    .flat();

  // first, estimate the value of the token by swapping 1 USDC for x tokens
  // need to look at other fee tiers?
  const decimals: { [address: string]: number } = {};
  const rawQtys: { [address: string]: number } = {};
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
        if (!(token in rawQtys)) rawQtys[token] = 0;
        if (r.output && r.output.amountOut > rawQtys[token])
          rawQtys[token] = r.output.amountOut;
      }),
    ),
    multiCall({
      calls: tokensIn.map((target: string) => ({ target })),
      abi: "erc20:decimals",
      chain,
      block,
    }).then((res: any) =>
      res.output.map((r: any) => {
        decimals[r.input.target] = r.output;
      }),
    ),
  ]);

  const prices: { [address: string]: number } = {};
  Object.keys(rawQtys).map((a: string) => {
    prices[a] = 10 ** decimals[a] / rawQtys[a];
  });

  const swaps: { [address: string]: { large: number; small: number } } = {};

  const dollarAmt = 10 ** 5;

  const calls: any[] = [];
  Object.keys(prices).map((t: string) =>
    fees.map((f: string) => {
      const largeQty = translateQty(dollarAmt, decimals[t], prices[t]);
      if (!largeQty) return;

      calls.push(
        ...[
          {
            target: contracts[chain].quoter,
            params: [
              [
                t,
                tokenOut,
                BigNumber.from(largeQty).toString(),
                BigNumber.from(f).toString(),
                sqrtPriceLimitX96,
              ],
            ],
          },
          {
            target: contracts[chain].quoter,
            params: [
              [
                t,
                tokenOut,
                BigNumber.from(largeQty.div(dollarAmt)).toString(),
                BigNumber.from(f).toString(),
                sqrtPriceLimitX96,
              ],
            ],
          },
        ],
      );
    }),
  );

  await Promise.all([
    multiCall({
      calls,
      abi: abi.quoteExactInputSingle,
      chain,
      block,
      permitFailure: true,
    }).then((res: any) =>
      res.output.map((r: any, i: number) => {
        const token = r.input.params[0][0];
        if (!(token in swaps)) swaps[token] = { large: -1, small: -1 };
        if (!r.output) return;
        if (i % 2 == 0) {
          if (
            swaps[token].large == -1 ||
            r.output.amountOut > swaps[token].large
          )
            swaps[token].large =
              (dollarAmt * 10 ** decimals[token]) / r.output.amountOut;
        } else {
          if (
            swaps[token].small == -1 ||
            r.output.amountOut > swaps[token].small
          )
            swaps[token].small = 10 ** decimals[token] / r.output.amountOut;
        }
      }),
    ),
  ]);

  return;
}

main([
  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
]);
// ts-node src/adapters/markets/uniswap/v3.ts
