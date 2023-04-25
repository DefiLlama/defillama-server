import { addressList } from "@defillama/dimension-adapters/users/list";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { PromisePool } from '@supercharge/promise-pool'
import { shuffleArray } from "./utils/shared/shuffleArray";
import { storeNewUsers } from "./users/storeUsers";
import { countNewUsers } from "@defillama/dimension-adapters/users/utils/countUsers";

async function storeActiveUsers() {
    await PromisePool
        .withConcurrency(16)
        .for(shuffleArray(addressList))
        .process(async ({ name, addresses, getAddresses, id }) => {
            if (!id) {
                console.log(`No id for ${name}, skipping...`) // No id to store
                return;
            }
            try {
                if(!addresses){
                    addresses = await getAddresses()
                }
                const end = Math.floor(Date.now() / 1e3)
                const start = end - 24 * 3600
                const users = await countNewUsers(addresses, start, end)
                await storeNewUsers(start, end, id, "all", Number(users))
            } catch (e) {
                console.log(`Storing users for ${name} failed with error`, e)
            }
        })
}

export default wrapScheduledLambda(storeActiveUsers);
