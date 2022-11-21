import { formatTimestampAsDate } from "../../../utils/date"
import executeAsyncBackfill from "./executeAsyncBackfill"
import getBackfillEvent from "./getBackfillEvent"
import readline from 'readline';
import { AdapterType } from "@defillama/adaptors/adapters/types";
import { IJSON } from "../../data/types";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export interface ICliArgs {
    onlyMissing: boolean,
    chain?: string,
    version?: string,
    timestamp?: number,
    recordTypes?: string[]
}

(async () => {
    if (process.argv.length < 3) {
        console.error(`Not enough args! Please, use\nnpm run backfill <type> <adapterName>\nor\nnpm run backfill <type> <adapterName> onlyMissing\nor\nnpm run backfill-local`)
        process.exit(1)
    }
    const type = process.argv[2] as AdapterType
    const adapterName = process.argv[3]
    const cliArguments = process.argv.filter(arg => arg.includes("=")).reduce((acc, cliArg) => {
        const [rawArgumentName, value] = cliArg.split("=")
        if (rawArgumentName === 'onlyMissing') {
            if (value === 'true' || !value) acc.onlyMissing = true
            else acc['onlyMissing'] === false
        }
        else if (rawArgumentName === 'chain') {
            if (value) acc.chain = value
            else throw new Error("Please provide a value for chain=[chain]")
        }
        else if (rawArgumentName === 'version') {
            if (value) acc.version = value
            else throw new Error("Please provide a value for version=[version]")
        }
        else if (rawArgumentName === 'timestamp') {
            if (!isNaN(+value)) acc.timestamp = +value
            else throw new Error("Please provide a proper value for timestamp=[timestamp]")
        }
        else if (rawArgumentName === 'recordTypes') {
            const recordTypes = value?.split(",")
            if (recordTypes && recordTypes.length > 0) acc.recordTypes = recordTypes
            else throw new Error("Please provide a value for recordType=[recordType]")
        }
        return acc
    }, {
        onlyMissing: false
    } as ICliArgs)
    console.info(`Started backfilling for ${adapterName} adapter`)
    console.info(`Generating backfill event...`)
    const backfillEvent = await getBackfillEvent(adapterName, type, cliArguments)
    console.info(`Backfill event generated!`)
    if (backfillEvent.backfill.length <= 0) {
        console.info("Has been generated an empty event, nothing to backfill...")
        rl.close();
        return
    }
    console.info(`${backfillEvent.backfill[0].dexNames[0].toUpperCase()} will be backfilled starting from ${formatTimestampAsDate(String(backfillEvent.backfill[0].timestamp!))}`)
    console.info(`${backfillEvent.backfill.length} days will be filled. If a chain is already available will be refilled.`)
    console.info(`With the following parameters:\nChain: ${backfillEvent.backfill[0].chain}\nRecord types: ${backfillEvent.backfill[0].adaptorRecordTypes}\nVersion: ${backfillEvent.backfill[0].protocolVersion}`)
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