import userAdapters from "../dimension-adapters/users/list";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { PromisePool } from '@supercharge/promise-pool'
import { shuffleArray } from "./utils/shared/shuffleArray";
import { storeGas, storeTxs, storeUsers } from "./users/storeUsers";
import { getGasPrice } from "./users/utils";

async function storeActiveUsers() {
    await PromisePool
        .withConcurrency(16)
        .for(shuffleArray(userAdapters))
        .process(async ({ name, getUsers, id }) => {
            if (!id) {
                console.log(`No id for ${name}, skipping...`) // No id to store
                return;
            }
            try {
                const end = Math.floor(Date.now() / 1e3)
                const start = end - 24 * 3600
                const users = await getUsers(start, end)
                await Promise.all(Object.entries(users).map(async ([chain, metrics]: [string, any]) => {
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
            } catch (e) {
                console.log(`Storing users for ${name} failed with error`, e)
            }
        })
}

export default wrapScheduledLambda(storeActiveUsers);
