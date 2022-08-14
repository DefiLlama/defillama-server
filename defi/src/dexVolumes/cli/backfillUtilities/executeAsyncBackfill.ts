/* import fs from "fs" */
import invokeLambda from "../../../utils/shared/invokeLambda";
import path from "path"

const EVENT_PATH = path.resolve(__dirname, "output", `backfill_event.json`);

export default async () => {
    let event
    try {
        event = require(EVENT_PATH)
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
    const result = (await invokeLambda(`defillama-prod-triggerStoreVolume`, event)) as { StatusCode: number, Payload: string }
    if (result.StatusCode === 202) console.info("Lambda invoked correctly, volumes are being stored in the ☁️")
    else console.info(result)
    /* console.info("Deleting event file...")
    fs.unlinkSync(EVENT_PATH)
    console.info("Event file deleted") */
}