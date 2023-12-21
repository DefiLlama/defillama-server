import { Token } from "./index";
import { fetch, formatExtraTokens } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const bridge = (
    await fetch("https://raw.githubusercontent.com/mantlenetworkio/mantle-token-lists/main/mantle.tokenlist.json")
  ).tokens as any[];

  const ethUrlMap = bridge
    .filter((token) => token.chainId === 1)
    .reduce((all, token) => {
      all[token.logoURI] = token;
      return all;
    }, {});

  const tokens: Token[] = [];
  bridge
    .filter((token) => token.chainId === 5000)
    .map((optToken) => {
      const ethToken = ethUrlMap[optToken.logoURI];
      if (ethToken === undefined) return;
      tokens.push({
        from: `mantle:${optToken.address}`,
        to: `ethereum:${ethToken.address}`,
        symbol: optToken.symbol,
        decimals: optToken.decimals
      });
    });
  const response =  [tokens, extraTokens]


  return response.flat()
}

const extraTokens = formatExtraTokens("mantle", []);
