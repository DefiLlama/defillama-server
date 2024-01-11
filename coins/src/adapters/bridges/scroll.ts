import { Token } from "./index";
import { fetch, formatExtraTokens } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const bridge = (
    await fetch("https://scroll-tech.github.io/token-list/scroll.tokenlist.json")
  ).tokens as any[];

  const ethUrlMap = bridge
    .filter((token) => token.chainId === 1)
    .reduce((all, token) => {
      all[token.logoURI] = token;
      return all;
    }, {});

  const tokens: Token[] = [];
  bridge
    .filter((token) => token.chainId === 534352)
    .map((optToken) => {
      const ethToken = ethUrlMap[optToken.logoURI];
      if (ethToken === undefined) return;
      tokens.push({
        from: `scroll:${optToken.address}`,
        to: `ethereum:${ethToken.address}`,
        symbol: optToken.symbol,
        decimals: optToken.decimals
      });
    });
  const response =  [tokens, extraTokens]


  return response.flat()
}

const extraTokens = formatExtraTokens("scroll", []);
