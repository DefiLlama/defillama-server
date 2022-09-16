/* import fs from "fs" */
import path from "path"
import { IHandlerEvent as ITriggerStoreVolumeEventHandler, handler as handlerTriggerStoreVolume, runStoreDex } from "../../../triggerStoreVolume"
import invokeLambda from "../../../utils/shared/invokeLambda";

const EVENT_PATH = path.resolve(__dirname, "output", `backfill_event.json`);

export default async (backfillEvent?: ITriggerStoreVolumeEventHandler) => {
    let event
    try {
        if (backfillEvent) event = backfillEvent
        else event = require(EVENT_PATH)
    } catch (error) {
        if (error instanceof Error)
            console.error(error.message)
    }
    if (!event || !event.backfill) {
        console.error("Event not found, please run RUNS.GET_BACKFILL_EVENT")
        return
    }
    if (event.backfill.length <= 0) {
        console.info("Empty event!")
        return
    }
    console.info("Event found!")
    console.info("Running lambda...")
    let result: any
    if (process.env.runLocal === 'true')
        result = await handlerTriggerStoreVolume(event)
    else
        result = (await invokeLambda(`defillama-prod-triggerStoreVolume`, event)) as { StatusCode: number, Payload: string }
    console.info("Lambda invoked correctly, volumes are being stored in the ☁️")
    /* console.info("Deleting event file...")
    fs.unlinkSync(EVENT_PATH)
    console.info("Event file deleted") */
}