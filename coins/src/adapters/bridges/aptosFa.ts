import { Token } from "./index";
import { fetch } from "../utils";

export default async function bridge(): Promise<Token[]> {
  const res = (await fetch(
    "https://raw.githubusercontent.com/PanoraExchange/Aptos-Tokens/refs/heads/main/token-list.json",
  )) as any[];

  const tokens: Token[] = [];
  res.map(({ decimals, symbol, faAddress, tokenAddress }) => {
    if (!faAddress || !tokenAddress) return;
    tokens.push({
      from: `aptos:${faAddress}`,
      to: `aptos:${tokenAddress}`,
      decimals,
      symbol,
    });
  });

  return tokens;
}
