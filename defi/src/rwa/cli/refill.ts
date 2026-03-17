import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import atvl from '../atvl';
import { getTimestampAtStartOfDay } from "../../utils/date";
import { initPG } from "../db";

async function main(
    startDate: string,
    endDate: string,
    ids: string[],
) {
    if (!startDate || !endDate || ids.length === 0) {
        console.error('Missing required arguments');
        process.exit(1);
    }
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);

    if (!start || !end) {
        console.error('Invalid date range');
        process.exit(1);
    }

    process.env.RWA_REFILL = 'true';

    await initPG();
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

// main('2025-03-23', '2026-02-03', ['79']) // ts-node defi/src/rwa/cli/refill.ts
