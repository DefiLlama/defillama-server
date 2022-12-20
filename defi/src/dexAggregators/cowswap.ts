// Source: https://docs.cow.fi/off-chain-services/api

import { ethers } from "ethers";
import fetch from "node-fetch";

export const chainToId = {
  ethereum: "https://api.cow.fi/mainnet",
  gnosis: "https://api.cow.fi/xdai",
};

export const name = "CowSwap";

const wrappedTokens = {
  ethereum: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  gnosis: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
};

export function approvalAddress() {
  return "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110";
}
const nativeToken = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
// https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/2.-query-the-fee-endpoint
export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to;
  const tokenFrom = from === ethers.constants.AddressZero ? wrappedTokens[chain as keyof typeof wrappedTokens] : from;
  // amount should include decimals
  const data = await fetch(`${chainToId[chain as keyof typeof chainToId]}/api/v1/quote`, {
    method: "POST",
    body: JSON.stringify({
      sellToken: tokenFrom,
      buyToken: tokenTo,
      receiver: extra.userAddress,
      appData: "0xf249b3db926aa5b5a1b18f3fec86b9cc99b9a8a99ad7e8034242d2838ae97422", // generated using https://explorer.cow.fi/appdata?tab=encode
      partiallyFillable: false,
      sellTokenBalance: "erc20",
      buyTokenBalance: "erc20",
      from: extra.userAddress,
      //"priceQuality": "fast",
      signingScheme: "ethsign",
      //"onchainOrder": false,
      kind: "sell",
      sellAmountBeforeFee: amount,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }).then((r) => r.json());

  return {
    amountReturned: data.quote.buyAmount,
    estimatedGas: 0,
    feeAmount: data.quote.feeAmount,
    validTo: data.quote.validTo,
    rawQuote: data,
    tokenApprovalAddress: "0xC92E8bdf79f0507f65a392b0ab4667716BFE0110",
  };
}
