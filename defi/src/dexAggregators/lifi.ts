// Source https://docs.1inch.io/docs/aggregation-protocol/api/swagger

import { ethers } from "ethers";

export const chainToId = {
  ethereum: "eth",
  polygon: "pol",
  bsc: "bsc",
  gnosis: "dai",
  fantom: "ftm",
  avax: "ava",
  arbitrum: "arb",
  optimism: "opt",
  moonriver: "mor",
  moonbeam: "moo",
  celo: "cel",
  fuse: "fus",
  cronos: "cro",
  velas: "vel",
  aurora: "aur",
};
export const name = "LI.FI";

const nativeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  // ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
  // amount should include decimals

  const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from;
  const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to;
  const chainId = chainToId[chain as keyof typeof chainToId];
  const data = await fetch(
    `https://li.quest/v1/quote?fromChain=${chainId}&toChain=${chainId}&fromToken=${tokenFrom}&toToken=${tokenTo}&fromAmount=${amount}&fromAddress=${
      extra.userAddress
    }&slippage=${+extra.slippage / 100 || "0.05"}`
  ).then((r) => r.json());

  const gas = data.estimate.gasCosts.reduce((acc: number, val: { estimate: string }) => +acc + val.estimate, 0);
  return {
    amountReturned: data.estimate.toAmount,
    estimatedGas: gas,
    tokenApprovalAddress: data.estimate.approvalAddress,
    rawQuote: data,
  };
}
