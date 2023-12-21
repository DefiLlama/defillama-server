require("dotenv").config();
import { addressList } from "../../../dimension-adapters/users/list";
import postgres from "postgres";
import { DAY } from "../../utils/date";
import { storeAllNewUsers } from "./queries/newUsers";

const sql = postgres(process.env.ACCOUNTS_DB!);

async function main(){
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