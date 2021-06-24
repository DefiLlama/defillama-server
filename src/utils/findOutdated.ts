import { hourlyTvl, getLastRecord } from "./getLastRecord";
import protocols from "../protocols/data";
import { toUNIXTimestamp } from "./date";

function humanizeTimeDifference(timeDelta:number){
    const hours = (timeDelta)/3600
    if(hours <= 24){
        return `(${Math.round(hours)} hours ago)`
    } else {
        return `(${Math.round(hours/24)} days ago)`
    }
}

export default async function findOutdated(maxDrift:number) {
  const now = toUNIXTimestamp(Date.now());
  const outdated = [] as string[][];
  await Promise.all(protocols.map(async protocol=>{
    const item = await getLastRecord(hourlyTvl(protocol.id));
    if (item === undefined) {
      outdated.push([protocol.name, "No TVL"])
    } else if (item.SK < now - maxDrift) {
      outdated.push([protocol.name, item.SK])
    }
  }))
  if(outdated.length===0){
    return null
  }
  const maxLengthProtocolName = outdated.reduce((max, line)=>Math.max(max, line[0].length), 0)
  return outdated.sort((a,b)=>{
      if(typeof a[1] === "string"){
        return 1
      } else if(typeof b[1] === "string"){
        return -1
      }
      return a[1]-b[1]
  }).map(line=>{
      line[0] = line[0].padEnd(maxLengthProtocolName);
      if(typeof line[1] === 'number'){
          line[1] = `Last update: ${new Date(line[1] * 1000).toDateString()} ${humanizeTimeDifference(now-line[1])}`
      }
      return line.join(' - ');
  }).join('\n')
}