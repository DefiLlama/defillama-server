import { Token } from "./index";
import { fetch, formatExtraTokens } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const bridge = (
    await fetch("https://static.optimism.io/optimism.tokenlist.json")
  ).tokens as any[];

  const ethUrlMap = bridge
    .filter((token) => token.chainId === 1)
    .reduce((all, token) => {
      all[token.logoURI] = token;
      return all;
    }, {});

  const tokens: Token[] = [];
  bridge
    .filter((token) => token.chainId === 8453)
    .map((optToken) => {
      const ethToken = ethUrlMap[optToken.logoURI];
      if (ethToken === undefined) return;
      tokens.push({
        from: `base:${optToken.address}`,
        to: `ethereum:${ethToken.address}`,
        symbol: optToken.symbol,
        decimals: optToken.decimals
      });
    });
  const response =  [tokens, extraTokens]

  return response.flat()
}

const extraTokens = formatExtraTokens("base", []);
