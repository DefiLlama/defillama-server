import { getProvider } from "@defillama/sdk/build/general";
import { lookupBlock } from "@defillama/sdk/build/util/index";
import type { Chain } from "@defillama/sdk/build/general";

// const chainsForBlocks = ["avax", "polygon", "xdai", "bsc", "fantom", "arbitrum"] as Chain[];
const chainsForBlocks = [] as Chain[];
const blockRetries = 5;

async function getChainBlocks(timestamp: number, chains: Chain[] = chainsForBlocks) {
  const chainBlocks = {} as {
    [chain: string]: number;
  };
  await Promise.all(
    chains.map(async (chain) => {
      for (let i = 0; i < blockRetries; i++) {
        try {
          console.log("block", chain)
          chainBlocks[chain] = await lookupBlock(timestamp, {
            chain,
          }).then((block) => block.block);
          console.log("block completed", chain)
          break;
        } catch (e) {
          if (i === blockRetries - 1) {
            throw e;
          }
        }
      }
    })
  );
  return chainBlocks;
}

export async function getCurrentBlocks() {
  const provider = getProvider("ethereum");
  const lastBlockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(lastBlockNumber - 5); // To allow indexers to catch up
  console.log("block eth")
  const chainBlocks = await getChainBlocks(block.timestamp);
  chainBlocks['ethereum'] = block.number;
  return {
    timestamp: block.timestamp,
    ethereumBlock: block.number,
    chainBlocks,
  };
}
