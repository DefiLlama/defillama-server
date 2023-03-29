import {users as chains} from "../dimension-adapters/users/chains";
import { cache20MinResponse, wrap, IResponse } from "./utils/shared";
import { getLastRecord } from "./utils/getLastRecord";

const handler = async (): Promise<IResponse> => {
    const activeAddresses = (await Promise.all(chains.map(async ({name})=>{
        const users = await getLastRecord(`users#${name}`)
        if(users === undefined) return null
        return {name, users: users.users}
    }))).filter(p=>p!==null)
    return cache20MinResponse(activeAddresses)
}

export default wrap(handler);
