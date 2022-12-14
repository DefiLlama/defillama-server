import fetch from "node-fetch";

export const chainToId = {
  ethereum: "ethereum",
  polygon: "polygon",
  arbitrum: "arbitrum",
  optimism: "optimism",
} as any;

const chainMap = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
} as any;
export const name = "Odos";

export async function getQuote(chain: string, from: string, to: string, amount: string, extra: any) {
  const gasPrice = await fetch(`https://app.odos.xyz/gas-prices/${chainMap[chain]}`).then((r) => r.json());

  const data = await fetch("https://app.odos.xyz/request-path", {
    headers: {
      "content-type": "application/json",
      "Referer": "https://app.odos.xyz/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "User-Agent":
        "Mozilla/5.0 (X11; Linux i686) AppleWebKit/5310 (KHTML, like Gecko) Chrome/36.0.846.0 Mobile Safari/5310",
    },
    body: JSON.stringify({
      fromValues: [+amount],
      fromTokens: [from],
      toTokens: [to],
      gasPrice: gasPrice?.prices[0]?.fee || gasPrice.base_fee,
      lpBlacklist: [],
      chain: chainToId[chain],
      slippageAmount: +extra.slippage,
      walletAddress: extra.userAddress,
    }),
    method: "POST",
  }).then((res) => res.json());

  return {
    amountReturned: data.outAmounts[0],
    estimatedGas: data.gasEstimate,
    tokenApprovalAddress: data.inputDests[0],
    rawQuote: data,
  };
}
