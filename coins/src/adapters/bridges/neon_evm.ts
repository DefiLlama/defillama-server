import { Token } from "./index";
import { fetch, formatExtraTokens } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const bridge = (
    await fetch("https://raw.githubusercontent.com/neonlabsorg/token-list/main/tokenlist.json")
  ).tokens as any[];

  const tokens: Token[] = [];
  bridge
    .map((token) => {
      if (token.chainId !== 245022934 || !token.address_spl) return;
      tokens.push({
        from: `neon_evm:${token.address}`,
        to: `solana:${token.address_spl}`,
        symbol: token.symbol,
        decimals: token.decimals
      });
    });
  const response =  [tokens, extraTokens]

  return response.flat()
}

const extraTokens = formatExtraTokens("neon_evm", []);
