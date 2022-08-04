import invokeLambda from "../../../utils/shared/invokeLambda";

export default async () => {
    let event
    try {
        event = require('./output/backfill_event.json')
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
    else result
}