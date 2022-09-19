import { Chain } from "@defillama/sdk/build/general";
import dexVolumes from "@defillama/adapters/volumes";
import { VolumeAdapter } from "@defillama/adapters/volumes/dexVolume.type";

const getAllChainsFromDexAdapters = (dexs2Filter: string[]) =>
    Object.entries(dexVolumes)
        .filter(([key]) => dexs2Filter.includes(key))
        .map(([_, volume]) => volume)
        .reduce((acc, dexAdapter) => {
            if ("volume" in dexAdapter) {
                const chains = Object.keys(dexAdapter.volume) as Chain[]
                for (const chain of chains)
                    if (!acc.includes(chain)) acc.push(chain)
            } else if ("breakdown" in dexAdapter) {
                for (const brokenDownDex of Object.values(dexAdapter.breakdown)) {
                    const chains = Object.keys(brokenDownDex) as Chain[]
                    for (const chain of chains)
                        if (!acc.includes(chain)) acc.push(chain)
                }
            } else console.error("Invalid adapter")
            return acc
        }, [] as Chain[])

export const getChainByProtocolVersion = (adapterVolume: string) => {
    const dexAdapter = (dexVolumes as unknown as { [volumeAdapter: string]: VolumeAdapter })[adapterVolume]
    const chainsAcc: {
        [protVersion: string]: string[]
    } = {}
    if ("volume" in dexAdapter) {
        return null
    } else if ("breakdown" in dexAdapter) {
        for (const [protVersion, brokenDownDex] of Object.entries(dexAdapter.breakdown)) {
            const chains = Object.keys(brokenDownDex) as Chain[]
            for (const c of chains) {
                const chain = formatChain(c)
                if (chainsAcc[protVersion]) {
                    if (!chainsAcc[protVersion].includes(chain)) chainsAcc[protVersion].push(chain)
                }
                else chainsAcc[protVersion] = [chain]
            }
        }
    } else console.error("Invalid adapter")
    return chainsAcc
}

export const formatChain = (chain: string) => {
        const c = chain === 'avax' ? "avalanche" : chain
        return c[0].toUpperCase() + c.slice(1)
}

export default getAllChainsFromDexAdapters