// Source: https://developers.paraswap.network/api/master

import { ethers } from "ethers";
import fetch from "node-fetch";

// api docs have an outdated chain list, need to check https://app.paraswap.io/# to find supported networks
export const chainToId = {
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  avax: 43114,
  arbitrum: 42161,
  fantom: 250,
};

export const name = "ParaSwap";
export const token = "PSP";

export function approvalAddress() {
  return "0x216b4b4ba9f3e719726886d34a177484278bfcae";
}
const nativeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  // ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
  // amount should include decimals

  const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from;
  const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to;
  const data = await fetch(
    `https://apiv5.paraswap.io/prices/?srcToken=${tokenFrom}&destToken=${tokenTo}&amount=${amount}&srcDecimals=${
      extra.fromToken?.decimals
    }&destDecimals=${extra.toToken?.decimals}&side=SELL&network=${chainToId[chain as keyof typeof chainToId]}`
  ).then((r) => r.json());

  const dataSwap = await fetch(`https://apiv5.paraswap.io/transactions/${chainToId[chain as keyof typeof chainToId]}`, {
    method: "POST",
    body: JSON.stringify({
      srcToken: data.priceRoute.srcToken,
      srcDecimals: data.priceRoute.srcDecimals,
      destToken: data.priceRoute.destToken,
      destDecimals: data.priceRoute.destDecimals,
      srcAmount: data.priceRoute.srcAmount,
      destAmount: data.priceRoute.destAmount,
      userAddress: extra.userAddress,
      txOrigin: extra.userAddress,
      deadline: Math.floor(Date.now() / 1000) + 300,
      priceRoute: data.priceRoute,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((r) => r.json());
  return {
    amountReturned: data.priceRoute.destAmount,
    estimatedGas: data.priceRoute.gasCost,
    tokenApprovalAddress: data.priceRoute.tokenTransferProxy,
    rawQuote: dataSwap,
    logo: "https://assets.coingecko.com/coins/images/20403/small/ep7GqM19_400x400.jpg?1636979120",
  };
}
