import { wrapScheduledLambda } from "./utils/shared/wrap";
import { PromisePool } from '@supercharge/promise-pool'
import { shuffleArray } from "./utils/shared/shuffleArray";
import { storeNewUsers } from "./users/storeUsers";
import { getR2 } from "./utils/r2";
import { storeUserInfo, userQueriesFilename } from "./storeActiveUsers";
import { retrieveAlliumResults } from "@defillama/dimension-adapters/helpers/allium";
import { parseChainResponse, parseUserResponse } from "@defillama/dimension-adapters/users/utils/countUsers";
import fetch from "node-fetch";

async function storeActiveUsers() {
    const queries = await fetch(`https://defillama-datasets.llama.fi/temp/userQueries.json`).then(r=>r.json())
    await PromisePool
        .withConcurrency(40)
        .for(shuffleArray(queries))
        .process(async ({ users, start, end, id, name, type }) => {
            if (!id) {
                console.log(`No id for ${name}, skipping...`) // No id to store
                return;
            }
            try {
                if(type === "newUsers"){
                    const query = await retrieveAlliumResults(users.queryId)
                    const result = query[0].user_count
                    if(result === undefined){
                        throw new Error("no numbers")
                    }
                    await storeNewUsers(start, end, id, "all", Number(result))
                } else {
                    let result;
                    if(id.startsWith("chain")){
                        result = await parseChainResponse(users.queryId)
                    } else {
                        result = await parseUserResponse(users.queryId, users.params)
                    }
                    await storeUserInfo(result, start, end, id)
                }
            } catch (e) {
                console.log(`Storing users for ${name} failed with error`, e)
            }
        })
}

export default wrapScheduledLambda(storeActiveUsers);
