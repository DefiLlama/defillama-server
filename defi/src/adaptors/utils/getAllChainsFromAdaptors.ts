import { AdapterType, SimpleAdapter } from "../data/types"
import { getChainDisplayName, normalizedChainReplacements } from "../../utils/normalizeChain";
import { getMethodologyByType as getDefaultMethodologyByCategory, } from "../data/helpers/methodology";
import { IJSON, ProtocolAdaptor } from "../data/types";

const chainNameCache: IJSON<string> = {}

export function getDisplayChainNameCached(chain: string) {
  if (!chainNameCache[chain]) chainNameCache[chain] = getDisplayChainName(chain) ?? chain
  return chainNameCache[chain]
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
    'avalanche': 'avax',
    'terra classic': "terra",
    'terra-classic': "terra",
    'zksync era': "era",
    'zksync lite': "zksync",
    'multiversx': "elrond",
    'okxchain': "okexchain",
    'gnosis': "xdai",
    'godwokenv1': "godwoken_v1",
    'milkomeda c1': "milkomeda",
    'oraichain': "orai",
    'cosmoshub': "cosmos",
    'rangers': "rpg",
    'polygon zkevm': "polygon_zkevm",
    'sxnetwork': "sx",
    'ontologyevm': "ontology_evm",
    'wanchain': "wan",
    'oasys': "oas",
    'wemix3.0': "wemix",
    'radix': "radixdlt",
    'neon': "neon_evm",
    'zetachain': "zeta",
    'zklink nova': "zklink",
    'immutable x': "imx",
    'bitlayer': "btr",
    'rootstock': "rsk",
} as IJSON<string>

export const formatChainKey = (chain: string) => {
    if (normalizeDimensionChainsMap[chain.toLowerCase()])
        return normalizeDimensionChainsMap[chain.toLowerCase()]
    return chain
}
