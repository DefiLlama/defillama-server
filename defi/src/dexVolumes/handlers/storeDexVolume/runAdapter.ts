import { Adapter, ChainBlocks, DISABLED_ADAPTER_KEY } from "@defillama/adapters/volumes/dexVolume.type"
import allSettled from "promise.allsettled/implementation"
import { ONE_DAY_IN_SECONDS } from "../getDexVolume"

export default async function runAdapter(volumeAdapter: Adapter, cleanCurrentDayTimestamp: number, chainBlocks: ChainBlocks, onError?: (e: Error) => void) {
    const cleanPreviousDayTimestamp = cleanCurrentDayTimestamp - ONE_DAY_IN_SECONDS
    const chains = Object.keys(volumeAdapter).filter(c => c !== DISABLED_ADAPTER_KEY)
    return allSettled(chains
        .filter(async (chain) => {
            const start = await volumeAdapter[chain].start().catch(e => {
                onError?.(new Error(`Error getting start time: ${e.message}`))
                return undefined
            })
            return start !== undefined && (start <= cleanPreviousDayTimestamp) || (start === 0)
        })
        .map(async (chain) => {
            const fetchFunction = volumeAdapter[chain].customBackfill ?? volumeAdapter[chain].fetch
            try {
                const startTimestamp = await volumeAdapter[chain].start()
                const result = await fetchFunction(cleanCurrentDayTimestamp - 1, chainBlocks);
                Object.keys(result).forEach(key => {
                    if (result[key] && Number.isNaN(+result[key])) delete result[key]
                })
                return ({
                    chain,
                    startTimestamp,
                    ...result
                });
            } catch (e) {
                return await Promise.reject({ chain, error: e, timestamp: cleanPreviousDayTimestamp });
            }
        }
        ))
}