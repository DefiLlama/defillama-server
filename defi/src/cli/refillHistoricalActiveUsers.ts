require("dotenv").config();
import userAdapters from "../../dimension-adapters/users/list";
import { storeUsers } from "../users/storeUsers";
import { shuffleArray } from "../utils/shared/shuffleArray";
import { PromisePool } from '@supercharge/promise-pool'
import sleep from "../utils/shared/sleep";
import { getTimestampAtStartOfDay } from "../utils/date";

async function main() {
    let end = getTimestampAtStartOfDay(Math.floor(Date.now() / 1e3))
    while (true) {
        console.log("end", end)
        const start = end - 24 * 3600
        const reorderedAdapterList = ([] as typeof userAdapters).concat(userAdapters); // shallow copy
        shuffleArray(reorderedAdapterList);
        PromisePool
            .withConcurrency(25)
            .for(reorderedAdapterList)
            .process(async ({ name, getUsers, id }) => {
                if (!id) {
                    console.log(`No id for ${name}, skipping...`)
                    return;
                }
                try {
                    const users = await getUsers(start, end)
                    await Promise.all(Object.entries(users).map(([chain, userNum]) => storeUsers(start, end, id, chain, Number(userNum))))
                } catch (e) {
                    console.log(`Storing users for ${name} failed with error`, e)
                }
            })
        await sleep(5*60*1e3) // 5 mins
        end = getTimestampAtStartOfDay(end - 12 * 3600);
    }
}
main()