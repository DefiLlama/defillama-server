import userAdapters from "../dimension-adapters/users/list";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { PromisePool } from '@supercharge/promise-pool'
import { shuffleArray } from "./utils/shared/shuffleArray";
import { storeGas, storeTxs, storeUsers } from "./users/storeUsers";
import { getGasPrice } from "./users/utils";
import { storeR2JSONString } from "./utils/r2";
import { storeNewUsers } from "./users/storeUsers";
import { countNewUsers } from "@defillama/dimension-adapters/users/utils/countUsers";

export function storeUserInfo(users:any, start:number, end:number, id:string) {
    return Promise.all(Object.entries(users).map(async ([chain, metrics]: [string, any]) => {
        if (metrics.users) {
            await storeUsers(start, end, id, chain, Number(metrics.users))
        }
        if (metrics.txs) {
            await storeTxs(start, end, id, chain, Number(metrics.txs))
        }
        if (metrics.gas) {
            try {
                const gasPrice = await getGasPrice(start, end, chain)
                if (typeof gasPrice !== "number" || Number.isNaN(gasPrice)) {
                    throw new Error(`gasPrice on ${chain} is ${gasPrice}`)
                }
                await storeGas(start, end, id, chain, Number(metrics.gas), gasPrice * Number(metrics.gas))
            } catch (e) {
                console.log(`Couldn't store gas data for ${name} on chain ${chain}`)
            }
        }
    }))
}
export const userQueriesFilename = "temp/userQueries.json"

async function storeActiveUsers() {
    const end = Math.floor(Date.now() / 1e3)
    const start = end - 24 * 3600
    const queries = [] as any[]
    await PromisePool
        .withConcurrency(40)
        .for(shuffleArray(userAdapters))
        .withTaskTimeout(60e3)
        .process(async ({ name, getUsers, id, addresses, getAddresses, getNewUsers }) => {
            if (!id) {
                console.log(`No id for ${name}, skipping...`) // No id to store
                return;
            }
            try {
                {
                    const users = await getUsers(start, end)
                    if(users.queryId){
                        queries.push({users, start, end, id, name, type: "users"})
                    } else {
                        await storeUserInfo(users, start, end, id)
                    }
                }
                if(![0, 8, 16].includes(new Date().getHours())){
                    return
                }
                if(getNewUsers){
                    await storeNewUsers(start, end, id, "all", Number(await getNewUsers(start, end)))
                } else {
                    if(!addresses){
                        addresses = await getAddresses()
                    }
                    const users = await countNewUsers(addresses, start, end)
                    queries.push({users, start, end, id, name, type: "newUsers"})
                }
            } catch (e) {
                console.log(`Storing users for ${name} failed with error`, e)
            }
        })
    await storeR2JSONString(userQueriesFilename, JSON.stringify(queries))
}

export default wrapScheduledLambda(storeActiveUsers);
