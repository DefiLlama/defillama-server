import { formatTimestampAsDate } from "../../../utils/date"
import executeAsyncBackfill from "./executeAsyncBackfill"
import getBackfillEvent from "./getBackfillEvent"
import readline from 'readline';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

(async () => {
    if (process.argv.length < 3) {
        console.error(`Not enough args! Please, use\n> npm run backfill-dex <adapterName>\nor\n> npm run backfill-dex <adapterName> onlyMissing`)
        process.exit(1)
    }
    const adapterName = process.argv[2]
    const onlyMissing = Number.isNaN(+process.argv[3]) ? process.argv[3] === 'onlyMissing' : +process.argv[3]
    console.info(`Started backfilling for ${adapterName} adapter`)
    console.info(`Generating backfill event...`)
    const backfillEvent = await getBackfillEvent(adapterName, onlyMissing)
    console.info(`Backfill event generated!`)
    if (backfillEvent.backfill.length <= 0) {
        console.info("Has been generated an empty event, nothing to backfill...")
        rl.close();
        return
    }
    console.info(`${backfillEvent.backfill[0].dexNames[0].toUpperCase()} will be backfilled starting from ${formatTimestampAsDate(String(backfillEvent.backfill[0].timestamp!))}`)
    console.info(`${backfillEvent.backfill.length} days will be filled. If a chain is already available will be refilled.`)
    rl.question('Do you wish to continue? y/n\n', async function (yn) {
        if (yn.toLowerCase() === 'y') {
            await executeAsyncBackfill(backfillEvent)
            console.info(`Don't forget to enable the adapter to src/dexVolumes/dexAdapters/config.ts, bye llama🦙`)
            rl.close();
            process.exit(0)
        }
        else {
            console.info("Backfill cancelled... bye llama🦙")
            rl.close();
            process.exit(0)
        }
    });
})()