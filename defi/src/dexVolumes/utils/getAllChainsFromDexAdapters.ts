import { Chain } from "@defillama/sdk/build/general";
import dexVolumes from "../../../DefiLlama-Adapters/dexVolumes";

const getAllChainsFromDexAdapters = Object.values(dexVolumes).reduce((acc, dexAdapter) => {
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

export default () => getAllChainsFromDexAdapters