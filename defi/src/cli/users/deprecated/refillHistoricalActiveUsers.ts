require("dotenv").config();
import userAdapters from "../../../../dimension-adapters/users/list";
import { storeUsers } from "../../../users/storeUsers";
import { shuffleArray } from "../../../utils/shared/shuffleArray";
import { PromisePool } from '@supercharge/promise-pool'
import sleep from "../../../utils/shared/sleep";
import { getTimestampAtStartOfDay } from "../../../utils/date";


async function main() {
    let start = getTimestampAtStartOfDay(1680652800)
    while (true) {
        console.log("start", start)
        const end = start + 24 * 3600
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
                } catch (e:any) {
                    console.log(`Storing users for ${name} failed with error`, e.message)
                }
            })
        await sleep(5*60*1e3) // 5 mins
        start = getTimestampAtStartOfDay(start - 12 * 3600);
    }
}
// DEPRECATED, use the other scripts to refill data, they are much more efficient and less error prone
// main()