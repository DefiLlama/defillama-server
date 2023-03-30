import {users as chains} from "../dimension-adapters/users/chains";
import ddb from "./utils/shared/dynamodb";
import { wrapScheduledLambda } from "./utils/shared/wrap";

async function storeActiveUsers(){
    await Promise.all(chains.map(async ({name, getUsers})=>{
        try{
            const end = Math.floor(Date.now()/1e3)
            const start = end - 24*3600
            const users = await getUsers(start, end)
            await ddb.put({
                PK: `users#${name}`,
                SK: end,
                start,
                users: Number(users)
            })
        } catch(e){
            console.log(`Storing users for ${name} failed with error`, e)
        }
    }))
}

export default wrapScheduledLambda(storeActiveUsers);
