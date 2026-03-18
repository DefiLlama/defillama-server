import providers from "@defillama/sdk/build/providers.json";

const chainIdToSlug: { [id: string]: string } = {
  avalanche: "avax",
  gnosis: "xdai",
};

Object.keys(providers).forEach((chain) => {
  const chainId = (providers as any)[chain].chainId;
  if (chainId !== undefined) {
    chainIdToSlug[chainId] = chain;
  }
});

export function resolveChain(chain: string): string {
  return chainIdToSlug[chain] ?? chain;
}

export function resolveChainInCoinId(coin: string): {
  chain: string;
  coin: string;
} {
  const colonIndex = coin.indexOf(":");
  if (colonIndex === -1) return { chain: "", coin };
  const chainRaw = coin.substring(0, colonIndex);
  const chain = resolveChain(chainRaw);
  if (chain === chainRaw) return { chain, coin };
  return { chain, coin: chain + coin.substring(colonIndex) };
}
