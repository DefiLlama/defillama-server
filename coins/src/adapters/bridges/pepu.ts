import { fetch } from "../utils";
import { Token } from "./index";
import providers from "@defillama/sdk/build/providers.json";

export const chainIdMap: { [id: number]: string } = {};
Object.keys(providers).map((c: string) => {
  chainIdMap[providers[c as keyof typeof providers].chainId] = c;
});

export default async function bridge(): Promise<Token[]> {
  const res = (
    await fetch("https://raw.githubusercontent.com/0sum-io/tokens/refs/heads/main/pepu-llama.json")
  ).tokens as any[];

  const tokens: Token[] = [];

  res.map(({ chainId, address, symbol, decimals, extensions}) => {
    if (!extensions?.bridgeInfo || !symbol || !decimals) return;
    const destinationChain = chainIdMap[chainId];
    Object.keys(extensions.bridgeInfo).map((key: any) => {
      const sourceChain = chainIdMap[key];
      const sourceAddress = extensions.bridgeInfo[key].tokenAddress;
      tokens.push({
        from: `${destinationChain}:${address}`,
        to: `${sourceChain}:${sourceAddress}`,
        symbol, 
        decimals
      });
    });
  });

  return tokens;
}