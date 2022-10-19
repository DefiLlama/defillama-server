import "../setup"
import { formatTimestampAsDate } from "../../../utils/date"
import executeAsyncBackfill from "./executeAsyncBackfill"
import getBackfillEvent from "./getBackfillEvent"
import { AdapterType } from "@defillama/adaptors/adapters/types";
import data from "../../data";
import sleep from "../../../utils/shared/sleep";


(async () => {
    const ADAPTER_TYPE = AdapterType.FEES
    const backfillAdapter = async (adapterName: string) => {
        console.info(`Started backfilling for ${adapterName} adapter`)
        console.info(`Generating backfill event...`)
        const backfillEvent = await getBackfillEvent(adapterName, ADAPTER_TYPE)
        console.info(`Backfill event generated!`)
        if (backfillEvent.backfill.length <= 0) {
            console.info("Has been generated an empty event, nothing to backfill...")
            return
        }
        console.info(`${backfillEvent.backfill[0].dexNames[0].toUpperCase()} will be backfilled starting from ${formatTimestampAsDate(String(backfillEvent.backfill[0].timestamp!))}`)
        console.info(`${backfillEvent.backfill.length} days will be filled. If a chain is already available will be refilled.`)
        await executeAsyncBackfill(backfillEvent)
        console.info(`Don't forget to enable the adapter to src/dexVolumes/dexAdapters/config.ts, bye llama🦙`)
    }
    const adaptorsData = data(ADAPTER_TYPE)
    for (const adapter of adaptorsData.default) {
        console.log("Sleeping for 2 minutes before launching next backfill", adapter.name)
        await sleep(1000 * 60 * 2)
        try {
            const r = await backfillAdapter(adapter.module)
            console.log("OK")
            console.log(r)
        } catch (error) {
            console.log("Error!")
            console.log(error)
        }
    }
})()