require("dotenv").config();
import { addressList } from "../../../dimension-adapters/users/list";
import getRecordEarliestTimestamp from "../../utils/shared/getRecordEarliestTimestamp";
import { dailyTvl } from "../../utils/getLastRecord";
import { DAY } from "../../utils/date";
import {date} from '../utils'
import { getAccountsDBConnection } from "../../getDBConnection";

async function main(){
    const table = [
        ["Protocol", "Time difference", "Earliest TVL date", "Earliest Users date"]
    ]
    await Promise.all(addressList.map(async ({id, name} )=>{
        const sql = getAccountsDBConnection()
        const earliestTvl = await getRecordEarliestTimestamp(dailyTvl(id))
        const earliestUsers = (await sql`SELECT start FROM dailyUsers where protocolId=${id} order by start asc`)[0]
        if(!earliestUsers){
            console.log(`Can't read user data for ${id} (${name})`)
            return
        }
        if(earliestTvl){
            const diff = Math.abs(earliestTvl.SK - earliestUsers.start)
            if(diff > DAY*2){
                table.push([name, `${(diff/DAY).toFixed(0)} days`, date(earliestTvl.SK).slice(1), date(earliestUsers.start).slice(1)])
            }
        }
    }))
    console.table(table)
}
main()