import { util } from "@defillama/sdk";
import { Chain, } from "@defillama/sdk/build/general";
import providers from "@defillama/sdk/build/providers.json";

const { blocks: { getBlocks, getCurrentBlocks, } } = util

type blockObjects = {
  chains?: Chain[] | undefined
  adapterModule?: any
  catchOnlyStaleRPC?: boolean
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

export async function getCurrentBlock(options: blockObjects = {}): Promise<getCurrentBlockResponse> {
  let { chains, adapterModule, catchOnlyStaleRPC } = options
  if (adapterModule) chains = getChainlist(adapterModule)
  chains = chains?.filter((i: string) => (providers as any)[i]).filter((i: string) => !['filecoin', 'crab', 'echelon','kava', 'boba_avax', 'milkomeda_a1', 'dogechain', 'clv', 'okexchain'].includes(i))
  try {
    const data = await getCurrentBlocks(chains)
    return data
  } catch (e) {
    console.log((e as any)?.message)
    if (!catchOnlyStaleRPC) throw e
    if ((e as any)?.message.includes('into the past')) throw e
    return getCurrentBlock({ chains: ['ethereum'] })
  }
}

type getCurrentBlockResponse = {
  timestamp: number
  ethereumBlock: number
  chainBlocks: any
}