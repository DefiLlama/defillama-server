import { Token } from "./index";
import { fetch, formatExtraTokens } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const bridge = (
    await fetch("https://raw.githubusercontent.com/Manta-Network/manta-pacific-token-list/main/json/manta-pacific-mainnet-token-list.json")
  ).tokens as any[];

  const tokens: Token[] = [];
  bridge
    .filter((token) => token.chainId === 169)
    .map((optToken) => {
      if (optToken.extension?.rootChainId !== 1) return;
      const ethToken = optToken.extension?.rootAddress
      if (ethToken === undefined) return;
      tokens.push({
        from: `manta:${optToken.address}`,
        to: `ethereum:${ethToken}`,
        symbol: optToken.symbol,
        decimals: optToken.decimals
      });
    });
  const response =  [tokens, extraTokens]

  return response.flat()
}

const extraTokens = formatExtraTokens("manta", []);
