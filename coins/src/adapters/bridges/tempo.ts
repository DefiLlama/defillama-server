import { Token } from "./index";
import { fetch } from "../utils";

const chainIdMap: { [id: number]: string } = {
  1: "ethereum",
};

export default async function bridge(): Promise<Token[]> {
  const { tokens: tokenList } = await fetch(
    "https://tokenlist.tempo.xyz/list/4217",
  );

  const tokens: Token[] = [];
  for (const token of tokenList) {
    const sourceChainId = token.extensions?.bridgeInfo?.sourceChainId;
    const sourceAddress = token.extensions?.bridgeInfo?.sourceAddress;
    if (!sourceChainId || !sourceAddress) continue;

    const sourceChain = chainIdMap[sourceChainId];
    if (!sourceChain) continue;

    tokens.push({
      from: `tempo:${token.address}`,
      to: `${sourceChain}:${sourceAddress}`,
      symbol: token.symbol,
      decimals: token.decimals,
    });
  }

  return tokens;
}