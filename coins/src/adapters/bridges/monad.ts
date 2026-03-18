import { Token } from "./index";
import { fetch } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const bridge = (
    await fetch("https://raw.githubusercontent.com/monad-crypto/token-list/refs/heads/main/tokenlist-mainnet.json")
  ).tokens as any[];

  const tokens: Token[] = [];
  bridge.map(({ chainId, extensions, address, symbol, decimals }) => {
    if (chainId !== 143 || !extensions?.coinGeckoId || !address || !symbol || !decimals) return;

    tokens.push({
      from: `monad:${address}`,
      to: `coingecko#${extensions.coinGeckoId}`,
      symbol,
      decimals,
    });
  });

  return tokens
}