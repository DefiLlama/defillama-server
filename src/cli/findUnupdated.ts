import { hourlyTvl, getLastRecord } from "../utils/getLastRecord";
import protocols from "../protocols/data";
import { toUNIXTimestamp } from "../utils/date";

const maxDrift = 3*3600; // Max three updates missed

async function main(){
    const now = toUNIXTimestamp(Date.now())
    for(const protocol of protocols){
        const item = await getLastRecord(hourlyTvl(protocol.id))
        if(item === undefined){
            console.log("No TVL recorded", protocol.name)
        }else if(item.SK < (now-maxDrift)){
            console.log("Stale", new Date(item.SK*1000).toDateString(), protocol.name)
        }
    }
}
main()