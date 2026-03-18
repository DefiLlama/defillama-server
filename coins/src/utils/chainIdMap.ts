import providers from "@defillama/sdk/build/providers.json";

const chainIdToSlug: { [id: number]: string } = {};
Object.keys(providers).forEach((chain) => {
  const chainId = (providers as any)[chain].chainId;
  if (chainId !== undefined) {
    chainIdToSlug[chainId] = chain;
  }
});

export function resolveChain(chain: string): string {
  if (/^\d+$/.test(chain)) {
    return chainIdToSlug[Number(chain)] ?? chain;
  }
  return chain;
}

export function resolveChainInCoinId(coin: string): string {
  const colonIndex = coin.indexOf(":");
  if (colonIndex === -1) return coin;
  const chain = coin.substring(0, colonIndex);
  const resolved = resolveChain(chain);
  if (resolved === chain) return coin;
  return resolved + coin.substring(colonIndex);
}
