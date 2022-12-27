import { providers } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import { ethers } from "ethers";
import fetch from "node-fetch";

export const chainToId = {
  ethereum: "ETH",
  bsc: "BSC",
  polygon: "POLYGON",
  optimism: "OPTIMISM",
  arbitrum: "ARBITRUM",
  gnosis: "GNOSIS",
  avax: "AVAX_CCHAIN",
  fantom: "FANTOM",
  aurora: "AURORA",
};

export const name = "Rango";
export const token = null;

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  // ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
  // amount should include decimals

  const chainId = chainToId[chain as keyof typeof chainToId];

  const tokenFrom =
    extra.fromToken.address === ethers.constants.AddressZero
      ? `${chainId}.${extra.fromToken.symbol}`
      : `${chainId}.${extra.fromToken.symbol}--${extra.fromToken.address}`;
  const tokenTo =
    extra.toToken.address === ethers.constants.AddressZero
      ? `${chainId}.${extra.toToken.symbol}`
      : `${chainId}.${extra.toToken.symbol}--${extra.toToken.address}`;
  const params = new URLSearchParams({
    from: tokenFrom,
    to: tokenTo,
    amount: amount,
    fromAddress: extra.userAddress || ethers.constants.AddressZero,
    toAddress: extra.userAddress || ethers.constants.AddressZero,
    disableEstimate: "true",
    apiKey: "c0ed54c0-e85c-4547-8e11-7ff88775b90c",
    slippage: extra.slippage || "1",
  }).toString();

  const data = await fetch(`https://api.rango.exchange/basic/swap?${params}`).then((r) => r.json());

  let estimatedGas;
  try {
    estimatedGas = await providers[chain].estimateGas({
      to: data?.tx?.txTo,
      data: data?.tx?.txData,
      value: data?.tx?.value,
    });
  } catch (e) {
    estimatedGas = BigNumber(data?.tx?.gasLimit).toString();
  }

  return {
    amountReturned: data?.route?.outputAmount,
    estimatedGas,
    tokenApprovalAddress: data?.tx?.txTo,
    rawQuote: data,
  };
}
