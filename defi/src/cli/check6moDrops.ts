import protocols from "../protocols/data"
import { toUNIXTimestamp } from "../utils/date";
import { dailyTvl, getLastRecord, hourlyTvl } from "../utils/getLastRecord";
import getTVLOfRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";

const months = 6;
const timestampToCompareWith = toUNIXTimestamp(Date.now() - 1e3*3600*24*30*months);


const main = async () => {
    const changes = (await Promise.all(protocols.map(async protocol=>{
        const current = await getLastRecord(hourlyTvl(protocol.id))
        const old = await getTVLOfRecordClosestToTimestamp(dailyTvl(protocol.id), timestampToCompareWith, 3600*24)
        if(old.SK === undefined || current === undefined || old.tvl === 0){
            return null
        }
        const difference = (current.tvl - old.tvl)/old.tvl * 100
        // Remove the following line if you just want a full list of differences
        if(Math.abs(difference)>5 || current.tvl < 1e6) return null
        return [protocol.name, difference] as [string, number]
    }))).filter(p=>p!=null).sort((a,b)=>a![1]-b![1])
    changes.map(c=>console.log(c![1].toFixed(2) + "\t", c![0]))
    console.log("Total:", changes.length)
};
main();
