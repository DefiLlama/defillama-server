import protocols from "../protocols/data";
import { getCurrentUnixTimestamp, secondsBetweenCallsExtra, secondsInDay } from "../utils/date";
import { dailyTvl, dailyTokensTvl, dailyUsdTokensTvl, getLastRecord, hourlyUsdTokensTvl } from "../utils/getLastRecord";
import getTVLOfRecordClosestToTimestamp from "../utils/shared/getRecordClosestToTimestamp";
import { humanizeNumber } from "@defillama/sdk/build/computeTVL/humanizeNumber";

async function main() {
    await Promise.all(
      protocols.map(async (protocol) => {
        const tvlPrefix = hourlyUsdTokensTvl
        const [last, old] = await Promise.all([
            getLastRecord(tvlPrefix(protocol.id)),
            getTVLOfRecordClosestToTimestamp(tvlPrefix(protocol.id), Math.round(getCurrentUnixTimestamp() - 2*secondsInDay), secondsInDay)
        ])
        if(last === undefined){
            //console.log("wtf missing protocol", protocol.name)
            return
        }
        Object.keys(old).forEach(chain=>{
            if(typeof old[chain] === "object"){
                if(!last[chain]){
                    //console.log("disappeared chain", protocol.name, chain)
                    return
                }
                for(const t of Object.keys(old[chain])){
                    if(last[chain][t] === undefined){
                        console.log("dropped token", protocol.name, chain, t, humanizeNumber(old[chain][t]))
                    }
                }
            }
        })
      })
    )
    process.exit(0)
}
main()