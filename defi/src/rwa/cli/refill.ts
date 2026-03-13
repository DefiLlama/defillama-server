import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import atvl from '../atvl';
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay } from "../../utils/date";
import { fetchTimestampsPG, initPG } from "../db";

// COMMENT OUT ENTRY IN atvl.ts
// COMPLETE THESE VARS
const start = 1742688001; // 23 mar 25
const end = 1770076801; // 3 feb 26
const ids = ['79'];

async function main() {
    await initPG();
    process.env.RWA_REFILL = 'true';
    const timestamps: number[] = []
    let workingNumber = end;
    while (workingNumber > start) {
        const cleanTimestamp = getTimestampAtStartOfDay(workingNumber);
        timestamps.push(cleanTimestamp);
        workingNumber -= 86400;
    }

    const errors: number[] = [];
    await runInPromisePool({
        items: timestamps,
        concurrency: 2,
        processor: async (timestamp: number) => {
            await atvl(timestamp, ids)
            .then(() => console.log(`Backfilled at timestamp ${timestamp}`))
            .catch((e) => {
                console.error(`Error backfilling at timestamp ${timestamp}: ${e}`);
                errors.push(timestamp);
            })
        }
    }).catch((e) => {
        console.error(`Error backfilling: ${e}`);
        process.exit();
    })

    console.log(`Error Count: ${errors.length} / ${timestamps.length}`);
    console.log(`Errors: ${errors.toString()}`);
    process.exit();
}

main() // ts-node defi/src/rwa/cli/refill.ts