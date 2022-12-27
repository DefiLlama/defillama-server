import { ethers } from "ethers";
import fetch from "node-fetch";

import { defillamaReferrerAddress } from "./constants";

export const chainToId = {
  ethereum: "https://api.0x.org/",
  bsc: "https://bsc.api.0x.org/",
  polygon: "https://polygon.api.0x.org/",
  optimism: "https://optimism.api.0x.org/",
  arbitrum: "https://arbitrum.api.0x.org/",
  avax: "https://avalanche.api.0x.org/",
  fantom: "https://fantom.api.0x.org/",
  celo: "https://celo.api.0x.org/",
};

export const name = "Matcha/0x";

const nativeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  // amount should include decimals

  const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from;
  const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to;
  const data = await fetch(
    `${
      chainToId[chain as keyof typeof chainToId]
    }swap/v1/quote?buyToken=${tokenTo}&sellToken=${tokenFrom}&sellAmount=${amount}&slippagePercentage=${
      extra.slippage / 100 || 1
    }&affiliateAddress=${defillamaReferrerAddress}&enableSlippageProtection=false`
  ).then((r) => r.json());
  return {
    amountReturned: data.buyAmount,
    estimatedGas: data.gas,
    tokenApprovalAddress: data.to,
    rawQuote: data,
  };
}
