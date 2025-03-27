import { formatTimestampAsDate } from "../../../utils/date"
import executeAsyncBackfill from "./executeAsyncBackfill"
import getBackfillEvent from "./getBackfillEvent"
import readline from 'readline';
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { IJSON } from "../../data/types";
import { getStringArrUnique } from "../../utils/getAllChainsFromAdaptors";
import sleep from "../../../utils/shared/sleep";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export interface ICliArgs {
    onlyMissing: boolean,
    chain?: string,
    version?: string,
    timestamp?: number,
    endTimestamp?: number,
    recordTypes?: string[]
}

export const autoBackfill = async (argv: string[]) => {
    if (argv.length < 3) {
        console.error(`Not enough args! Please, use\nnpm run backfill <type> <adapterName>\nor\nnpm run backfill <type> <adapterName> onlyMissing\nor\nnpm run backfill-local`)
        process.exit(1)
    }
    const type = argv[2] as AdapterType
    const adapterName = argv[3].split(',') as string[]
    const cliArguments = argv.filter(arg => arg.includes("=")).reduce((acc, cliArg) => {
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
        else if (rawArgumentName === 'endTimestamp') {
            if (!isNaN(+value)) acc.endTimestamp = +value
            else throw new Error("Please provide a proper value for endTimestamp=[timestamp]")
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
    if (!backfillEvent.backfill || backfillEvent.backfill.length <= 0) {
        console.info("Has been generated an empty event, nothing to backfill...")
        rl.close();
        return
    }
    const uniqueModules2Backfill = getStringArrUnique([...backfillEvent.backfill.map(n => n.dexNames).flat(1)])
    console.info(uniqueModules2Backfill.length, "protocols will be backfilled")
    console.info(`${uniqueModules2Backfill} will be backfilled starting from ${formatTimestampAsDate(String(backfillEvent.backfill[0].timestamp!))}`)
    console.info(`${backfillEvent.backfill.length} days will be filled. If a chain is already available will be refilled.`)
    console.info(`With the following parameters:\nChain: ${backfillEvent.backfill[0].chain}\nRecord types: ${backfillEvent.backfill[0].adaptorRecordTypes}\nVersion: ${backfillEvent.backfill[0].protocolVersion}`)
    if (argv[0] !== '')
        rl.question('Do you wish to continue? y/n\n', async function (yn) {
            if (yn.toLowerCase() === 'y') {
                backfillEvent.backfill = backfillEvent.backfill ? backfillEvent.backfill?.reverse() as any[] : []
                await executeAsyncBackfill(backfillEvent)
                /* for (let i = 70; i < backfillEvent.backfill.length; i += 50) {
                    const smallbackfillEvent = {
                        ...backfillEvent,
                        backfill: backfillEvent.backfill.slice(i, i + 50),
                    };
                    console.info(`${smallbackfillEvent.backfill[0].dexNames[0].toUpperCase()} will be backfilled starting from ${formatTimestampAsDate(String(smallbackfillEvent.backfill[0].timestamp!))}`)
                    console.info(`${smallbackfillEvent.backfill.length} days will be filled. If a chain is already available will be refilled.`)
                    await executeAsyncBackfill(smallbackfillEvent)
                    await sleep(1000 * 60 * 2)
                } */
                console.info(`Don't forget to enable the adapter to src/adaptors/data/${type}/config.ts, bye llama🦙`)
                rl.close();
            }
            else {
                console.info("Backfill cancelled... bye llama🦙")
                rl.close();
            }
        });
    else {
        rl.close();
        await executeAsyncBackfill(backfillEvent)
    }
}
