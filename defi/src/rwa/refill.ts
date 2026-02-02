import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import atvl from './atvl';
import setEnvSecrets from '../utils/shared/setEnvSecrets';
import { getCurrentUnixTimestamp } from "../utils/date";

const start = 1735690215; // 1 Jan 2025
const end = getCurrentUnixTimestamp()

async function main() {
    await setEnvSecrets()
    const timestamps: number[] = []
    let workingNumber = end;
    while (workingNumber > start) {
        timestamps.push(workingNumber);
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