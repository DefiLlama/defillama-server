import { getBlocks, getCurrentBlocks, } from "@defillama/sdk/build/computeTVL/blocks";

type blockObjects = {
  chains?: string[] | undefined
  adapterModule?: any
}

export async function getBlocksRetry(timestamp: number, options: blockObjects = {}) {
  let { chains, adapterModule, } = options
  if (adapterModule) {
    chains = getChainlist(adapterModule)
  }
  return getBlocks(timestamp, chains)
}

export async function getEthBlock(timestamp: number) {
  return getBlocks(timestamp, [])
}

function getChainlist(adapterModule: any) {
  return Object.keys(adapterModule).filter(item => typeof adapterModule[item] === 'object' && !Array.isArray(adapterModule[item]));
}

export async function getCurrentBlock(options: blockObjects = {}) {
  let { chains, adapterModule } = options
  if (adapterModule) chains = getChainlist(adapterModule)
  return getCurrentBlocks(chains)
}
