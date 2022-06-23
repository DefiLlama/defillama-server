import protocols from "../protocols/data"
import { toUNIXTimestamp } from "../utils/date";
import { dailyTvl, getLastRecord, hourlyTvl } from "../utils/getLastRecord";
import getTVLOfRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";

const old6moTimestamp = toUNIXTimestamp(Date.now() - 1e3*3600*24*30*6);

const main = async () => {
    const changes = (await Promise.all(protocols.map(async protocol=>{
        const current = await getLastRecord(hourlyTvl(protocol.id))
        const old = await getTVLOfRecordClosestToTimestamp(dailyTvl(protocol.id), old6moTimestamp, 3600*24)
        if(old.SK === undefined || current === undefined || old.tvl === 0){
            return null
        }
        const difference = (current.tvl - old.tvl)/old.tvl * 100
        return [protocol.name, difference] as [string, number]
    }))).filter(p=>p!=null).sort((a,b)=>a![1]-b![1])
    changes.map(c=>console.log(c![1].toFixed(2) + "\t", c![0]))
};
main();
