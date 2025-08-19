import { Adapter, BaseAdapter, AdapterType, SimpleAdapter } from "@defillama/dimension-adapters/adapters/types";
import { CHAIN } from "@defillama/dimension-adapters/helpers/chains";
import { getChainDisplayName, normalizedChainReplacements } from "../../utils/normalizeChain";
import { getMethodologyByType as getDefaultMethodologyByCategory, } from "../data/helpers/methodology";
import { IJSON, ProtocolAdaptor } from "../data/types";

const chainNameCache: IJSON<string> = {}

export function getDisplayChainNameCached(chain: string) {
  if (!chainNameCache[chain]) chainNameCache[chain] = getDisplayChainName(chain) ?? chain
  return chainNameCache[chain]
}

export const getChainsFromBaseAdapter = (moduleAdapter: BaseAdapter) => {
    return Object.keys(moduleAdapter)
}


export const getMethodologyDataByBaseAdapter = (moduleObject: SimpleAdapter, type?: string, category?: string): ProtocolAdaptor['methodology'] | undefined => {
    let methodology = (moduleObject as any).methodology
    if (!methodology && type === AdapterType.FEES) return { ...(getDefaultMethodologyByCategory(category ?? '') ?? {}) }
    if (typeof methodology === 'string') return methodology
    return {
        ...(getDefaultMethodologyByCategory(category ?? '') ?? {}),
        ...methodology
    }
}

export const getDisplayChainName = (chain: string) => {
    if (!chain) return chain
    let c = formatChainKey(chain.toLowerCase())
    return getChainDisplayName(c, true)
}

export const normalizeDimensionChainsMap = {
    ...normalizedChainReplacements,
    'avalanche': CHAIN.AVAX,
    'terra classic': CHAIN.TERRA,
    'terra-classic': CHAIN.TERRA,
    'karura': CHAIN.KARURA,
    'zksync era': CHAIN.ERA,
    'zksync lite': CHAIN.ZKSYNC,
    'multiversx': CHAIN.ELROND,
    'okxchain': CHAIN.OKEXCHAIN,
    'gnosis': CHAIN.XDAI,
    'godwokenv1': CHAIN.GODWOKEN_V1,
    'milkomeda c1': CHAIN.MILKOMEDA,
    'oraichain': CHAIN.ORAI,
    'cosmoshub': CHAIN.COSMOS,
    'rangers': CHAIN.RPG,
    'polygon zkevm': CHAIN.POLYGON_ZKEVM,
    'sxnetwork': CHAIN.SX,
    'ontologyevm': CHAIN.ONTOLOGY_EVM,
    'wanchain': CHAIN.WAN,
    'oasys': CHAIN.OAS,
    'wemix3.0': CHAIN.WEMIX,
    'radix': CHAIN.RADIXDLT,
    'neon': CHAIN.NEON,
    'zetachain': CHAIN.ZETA,
    'zklink nova': CHAIN.ZKLINK,
    'immutable x': CHAIN.IMMUTABLEX,
    'bitlayer': CHAIN.BITLAYER,
    'rootstock': CHAIN.ROOTSTOCK,
} as IJSON<CHAIN>

export const formatChainKey = (chain: string) => {
    if (normalizeDimensionChainsMap[chain.toLowerCase()])
        return normalizeDimensionChainsMap[chain.toLowerCase()]
    return chain
}
