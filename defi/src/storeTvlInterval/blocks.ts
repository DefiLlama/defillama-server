import { util } from "@defillama/sdk";
import { Chain } from "@defillama/sdk/build/general";

const { blocks: { getBlocks, getCurrentBlocks, } } = util

type blockObjects = {
  chains?: Chain[] | undefined
  adapterModule?: any
}
type ChainBlocks = {
  [chain: string]: number;
}

type blockResponse = {
  ethereumBlock: number
  chainBlocks: ChainBlocks
}

export async function getBlocksRetry(timestamp: number, options: blockObjects = {}): Promise<blockResponse> {
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
  const res = Object.keys(adapterModule).filter(item => typeof adapterModule[item] === 'object' && !Array.isArray(adapterModule[item])) as Chain[]
  return res.filter((i: string) => i !== 'default')
}

export async function getCurrentBlock(options: blockObjects = {}) {
  let { chains, adapterModule } = options
  if (adapterModule) chains = getChainlist(adapterModule)
  return getCurrentBlocks(chains)
}
