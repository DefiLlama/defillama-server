import adapterList, { addressList } from "@defillama/dimension-adapters/users/list";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { PromisePool } from '@supercharge/promise-pool'
import { shuffleArray } from "./utils/shared/shuffleArray";
import { storeNewUsers } from "./users/storeUsers";
import { countNewUsers } from "@defillama/dimension-adapters/users/utils/countUsers";

async function storeActiveUsers() {
    const listWithNewUsers = addressList.concat(adapterList.filter((adapter:any)=>adapter.getNewUsers) as any[])
    await PromisePool
        .withConcurrency(40)
        .for(shuffleArray(listWithNewUsers))
        .process(async ({ name, addresses, getAddresses, id, getNewUsers }) => {
            if (!id) {
                console.log(`No id for ${name}, skipping...`) // No id to store
                return;
            }
            try {
                const end = Math.floor(Date.now() / 1e3)
                const start = end - 24 * 3600
                let users:number
                if(getNewUsers){
                    users = await getNewUsers(start, end)
                } else {
                    if(!addresses){
                        addresses = await getAddresses()
                    }
                    if(addresses.bsc !== undefined){
                        return; // allium has no support for bsc atm
                    }
                    users = await countNewUsers(addresses, start, end)
                }
                await storeNewUsers(start, end, id, "all", Number(users))
            } catch (e) {
                console.log(`Storing users for ${name} failed with error`, e)
            }
        })
}

export default wrapScheduledLambda(storeActiveUsers);
