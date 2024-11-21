import { fetch, formatExtraTokens } from "../utils";

export default async function bridge() {
  // https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_gemini_token_list.json
  const bridge = (
    await fetch("https://tokenlist.arbitrum.io/ArbTokenLists/42170_arbed_uniswap_labs_default.json")
  ).tokens as any[];

  return bridge
    .map((token) => {
      if (token.extensions == null)
        return {
          from: `arbitrum_nova:${token.address}`,
          to: `null`,
          symbol: token.symbol,
          decimals: token.decimals
        };
      const bridged = token.extensions.bridgeInfo[1].tokenAddress;
      return {
        from: `arbitrum_nova:${token.address}`,
        to: `ethereum:${bridged}`,
        symbol: token.symbol,
        decimals: token.decimals
      };
    })
    .filter((t) => t.to != "null")
    .concat(extraTokens);
}

const extraTokens = formatExtraTokens("arbitrum_nova", []);
