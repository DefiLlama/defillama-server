// Source https://docs.1inch.io/docs/aggregation-protocol/api/swagger

import { ethers } from "ethers";
import { defillamaReferrerAddress } from "./constants";

export const chainToId = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  optimism: 10,
  arbitrum: 42161,
  gnosis: 100,
  avax: 43114,
  fantom: 250,
  klaytn: 8217,
  aurora: 1313161554,
};

export const name = "1inch";

const nativeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  // ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
  // amount should include decimals

  const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from;
  const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to;
  const chainId = chainToId[chain as keyof typeof chainToId];
  const [data, { address: tokenApprovalAddress }, swapData] = await Promise.all([
    fetch(
      `https://api.1inch.io/v4.0/${chainId}/quote?fromTokenAddress=${tokenFrom}&toTokenAddress=${tokenTo}&amount=${amount}&slippage=${extra.slippage}`
    ).then((r) => r.json()),
    fetch(`https://api.1inch.io/v4.0/${chainId}/approve/spender`).then((r) => r.json()),
    fetch(
      `https://api.1inch.io/v4.0/${chainId}/swap?fromTokenAddress=${tokenFrom}&toTokenAddress=${tokenTo}&amount=${amount}&fromAddress=${extra.userAddress}&slippage=${extra.slippage}&referrerAddress=${defillamaReferrerAddress}`
    ).then((r) => r.json()),
  ]);

  return {
    amountReturned: data.toTokenAmount,
    estimatedGas: data.estimatedGas,
    tokenApprovalAddress,
    rawQuote: swapData,
  };
}
