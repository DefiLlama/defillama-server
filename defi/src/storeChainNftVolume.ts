import { wrapScheduledLambda } from "./utils/shared/wrap";
import { PromisePool } from '@supercharge/promise-pool'
import { shuffleArray } from "./utils/shared/shuffleArray";
import { storeR2JSONString } from "./utils/r2";
import { chains } from "@defillama/dimension-adapters/nfts/chains";
import dynamodb from "./utils/shared/dynamodb";
import { getCurrentUnixTimestamp } from "./utils/date";

async function storeActiveUsers() {
    const end = Math.floor(Date.now() / 1e3)
    const start = end - 24 * 3600
    const allChains:any = {}
    await PromisePool
        .withConcurrency(40)
        .for(shuffleArray(chains))
        .withTaskTimeout(60e3)
        .process(async ([name, adapter]) => {
            try {
                {
                    const {volume} = await adapter(start, end)
                    await dynamodb.put({
                        PK: `nft#${name}`,
                        SK: getCurrentUnixTimestamp(),
                        volume
                    })
                    allChains[name]=volume
                }
            } catch (e) {
                console.log(`Storing users for ${name} failed with error`, e)
            }
        })
    await storeR2JSONString("temp/chainNfts", JSON.stringify(allChains))
}

export default wrapScheduledLambda(storeActiveUsers);
