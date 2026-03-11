import fetch from "node-fetch";
import { storeR2JSONString } from "../utils/r2";
import { blockExplorers } from "../blockExplorers";
import { getChainDisplayName } from "../utils/normalizeChain";

const CHAINLIST_API = "https://chainlist.org/rpcs.json";

interface ChainlistExplorer {
  name: string;
  url: string;
  standard?: string;
}

interface ChainlistEntry {
  name: string;
  explorers?: ChainlistExplorer[];
  chainSlug?: string;
  chainId: number
  isTestnet: boolean;
}

interface BlockExplorerEntry {
  displayName: string;
  llamaChainId: string | null;
  evmChainId: number | null;
  blockExplorers: Array<{ name: string; url: string }>;
}

function urlAlreadyExists(existing: Array<{ name: string; url: string }>, newUrl: string): boolean {
  return existing.some((e) => e.url.includes(newUrl) || newUrl.includes(e.url));
}

async function storeBlockExplorers() {
  const data: BlockExplorerEntry[] = Object.entries(blockExplorers).map(([chainId, explorers]) => ({
    displayName: getChainDisplayName(chainId, true),
    llamaChainId: chainId,
    evmChainId: null,
    blockExplorers: explorers,
  }));

  const llamaChainIdIndex = new Map<string, BlockExplorerEntry>();
  for (const entry of data) {
    if (entry.llamaChainId) llamaChainIdIndex.set(entry.llamaChainId, entry);
  }

  const chainlistData = await fetch(CHAINLIST_API).then(res => res.json()) as ChainlistEntry[];

  console.log(`Fetched ${chainlistData.length} chains from chainlist API`);

  for (const chain of chainlistData) {
    if (!chain.explorers?.length) continue;
    if (chain.isTestnet) continue;

    const apiExplorers = chain.explorers.map((e) => ({ name: e.name, url: e.url }));
    const existing = chain.chainSlug ? llamaChainIdIndex.get(chain.chainSlug) : undefined;

    if (existing) {
      existing.evmChainId = chain.chainId;
      for (const explorer of apiExplorers) {
        if (!urlAlreadyExists(existing.blockExplorers, explorer.url)) {
          existing.blockExplorers.push(explorer);
        }
      }
    } else {
      const slugDisplayName = chain.chainSlug ? getChainDisplayName(chain.chainSlug, true) : null;
      const newEntry: BlockExplorerEntry = {
        displayName: slugDisplayName || chain.name,
        llamaChainId: chain.chainSlug ?? null,
        evmChainId: chain.chainId,
        blockExplorers: apiExplorers,
      };
      data.push(newEntry);
      if (newEntry.llamaChainId) llamaChainIdIndex.set(newEntry.llamaChainId, newEntry);
    }
  }

  console.log(`Storing ${data.length} chains with block explorers to R2`);
  await storeR2JSONString("blockExplorers.json", JSON.stringify(data), 24 * 60 * 60);
}

storeBlockExplorers().then(() => {
  console.log("storeBlockExplorers completed successfully");
  process.exit(0);
}).catch(e => {
  console.error("Unexpected error in storeBlockExplorers:", e);
  process.exit(1);
});
