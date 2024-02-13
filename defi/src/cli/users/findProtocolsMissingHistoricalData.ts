require("dotenv").config();
import { addressList } from "../../../dimension-adapters/users/list";
import { getAccountsDBConnection } from "../../getDBConnection";
import { DAY } from "../../utils/date";
import { storeAllNewUsers } from "./queries/newUsers";

async function main(){
    const sql = getAccountsDBConnection();
    await Promise.all(addressList.map(async (protocol:any)=>{
        const earliestUsers = (await sql`SELECT start FROM dailyNewUsers where protocolId=${protocol.id} order by start asc`)[0]
        try{
            if(earliestUsers.start > Date.now()/1e3-3*DAY){
                if(protocol.getAddresses){
                    protocol.addresses = await protocol.getAddresses()
                }
                console.log(protocol.name)
                await storeAllNewUsers(protocol)
                console.log("filled", protocol.name)
            }
        } catch(e){
            console.log("error", protocol.name)
        }
    }))
    process.exit(0)
}
main()