import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import atvl from '../atvl';
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay } from "../../utils/date";
import { fetchTimestampsPG, initPG } from "../db";

const start = 1735690215; // 1 Jan 2025
const end = getCurrentUnixTimestamp()

async function main() {
    await initPG();
    const done = await fetchTimestampsPG();
    const timestamps: number[] = []
    let workingNumber = end;
    let finished = 0;
    while (workingNumber > start) {
        const cleanTimestamp = getTimestampAtStartOfDay(workingNumber);
        if (done.includes(cleanTimestamp)) finished ++
        if (!done.includes(cleanTimestamp)) timestamps.push(cleanTimestamp);
        workingNumber -= 86400;
    }

    await runInPromisePool({
        items: timestamps,
        concurrency: 5,
        processor: async (timestamp: number) => {
            await atvl(timestamp).catch((e) => {
                console.error(`Error backfilling at timestamp ${timestamp}: ${e}`);
            });
            console.log(`Backfilled at timestamp ${timestamp}`);
        }
    }).catch((e) => {
        console.error(`Error backfilling: ${e}`);
        process.exit();
    })

    process.exit();
}

main() // ts-node defi/src/rwa/refill.ts