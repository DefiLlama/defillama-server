import { VolumeAdapter } from "@defillama/adapters/volumes/dexVolume.type";
import type { FeeAdapter } from "@defillama/fees-adapters/adapters.type"

const runAdapter = async (adapter: VolumeAdapter | FeeAdapter) => {
    console.log("adapter", adapter)
}

(async () => {
    const adapter = (await import("@defillama/fees-adapters/fees/bitcoin")).default
    console.log(await runAdapter(adapter))
})()