import { allChainKeys } from "../constants";
import fetch from "node-fetch";
import { getChainDisplayName } from "../../src/utils/normalizeChain";

async function main() {
  const allChains: { name: string; tvl: number }[] = await fetch("https://api.llama.fi/v2/chains").then((r) =>
    r.json()
  );
  const supportedChainDisplayNames: { [displayName: string]: string } = {};
  allChainKeys.map((c) => {
    supportedChainDisplayNames[getChainDisplayName(c, true)] = c;
  });

  const missingChains: { name: string; tvl: number }[] = [];
  allChains.map(({ name, tvl }) => {
    if (Object.keys(supportedChainDisplayNames).includes(name)) return;
    const tvlInMillions = Number((tvl / 1e6).toFixed(0));
    missingChains.push({ name, tvl: tvlInMillions });
  });

  missingChains.sort((a, b) => b.tvl - a.tvl);
  console.log(missingChains.slice(0, 10));
}
main(); // ts-node defi/l2/cli/findGoodChains.ts
