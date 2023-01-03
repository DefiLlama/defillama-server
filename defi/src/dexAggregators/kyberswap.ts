import { ethers } from "ethers";
import fetch from "node-fetch";

// https://docs.kyberswap.com/Aggregator/aggregator-api#tag/swap/operation/get-route-encode
export const chainToId = {
  ethereum: "ethereum",
  bsc: "bsc",
  polygon: "polygon",
  optimism: "optimism",
  arbitrum: "arbitrum",
  avax: "avalanche",
  fantom: "fantom",
  aurora: "aurora",
  bttc: "bttc",
  cronos: "cronos",
  oasis: "oasis",
  velas: "velas",
};

export const name = "KyberSwap";
export const token = "KNC";

export function approvalAddress() {
  return "0x00555513Acf282B42882420E5e5bA87b44D8fA6E";
}

const nativeToken = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from;
  const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to;

  const data = await fetch(
    `https://aggregator-api.kyberswap.com/${
      chainToId[chain as keyof typeof chainToId]
    }/route/encode?tokenIn=${tokenFrom}&tokenOut=${tokenTo}&amountIn=${amount}&to=${
      extra.userAddress
    }&saveGas=0&gasInclude=0&slippageTolerance=${+extra.slippage * 100 || 50}&clientData={"source":"DefiLlama"}`,
    {
      headers: {
        "Accept-Version": "Latest",
      },
    }
  ).then((r) => r.json());
  return {
    amountReturned: data.outputAmount,
    estimatedGas: data.totalGas,
    tokenApprovalAddress: data.routerAddress,
    rawQuote: data,
  };
}
