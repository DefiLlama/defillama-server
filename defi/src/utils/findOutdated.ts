import { hourlyTvl, getLastRecord } from "./getLastRecord";
import protocols from "../protocols/data";
import { toUNIXTimestamp } from "./date";

function humanizeTimeDifference(timeDelta: number) {
  const hours = (timeDelta) / 3600
  if (hours <= 24) {
    return `(${Math.round(hours)} hours ago)`
  } else {
    return `(${Math.round(hours / 24)} days ago)`
  }
}

function printOutdated(outdated: [string, string | number, boolean][], maxLengthProtocolName: number, now:number) {
  return outdated.sort((a, b) => {
    if (typeof a[1] === "string") {
      return 1
    } else if (typeof b[1] === "string") {
      return -1
    }
    return a[1] - b[1]
  }).map(line => {
    line[0] = line[0].padEnd(maxLengthProtocolName);
    if (typeof line[1] === 'number') {
      line[1] = `Last update: ${new Date(line[1] * 1000).toDateString()} ${humanizeTimeDifference(now - line[1])}`
    }
    const text = line.slice(0, 2).join(' - ')
    return text;
  }).join('\n')
}

export default async function findOutdated(maxDrift: number) {
  const now = toUNIXTimestamp(Date.now());
  const outdated = [] as [string, string | number, boolean][];
  await Promise.all(protocols.map(async protocol => {
    const item = await getLastRecord(hourlyTvl(protocol.id));
    let text: string;
    if (item === undefined) {
      text = "No TVL"
    } else if (item.SK < (now - maxDrift)) {
      text = item.SK
    } else {
      return
    }
    const module = await import(`../../DefiLlama-Adapters/projects/${protocol.module}`)
    if(protocol.chain === "Fantom" || module.fantom !== undefined){
      const refillable = !(module.fetch || module.timetravel === false)
      outdated.push([protocol.name, text, refillable])
    }
  }))
  if (outdated.length === 0) {
    return null
  }
  const maxLengthProtocolName = outdated.reduce((max, line) => Math.max(max, line[0].length), 0)
  return `REFILLABLE
${printOutdated(outdated.filter(p => p[2]), maxLengthProtocolName, now)}

CAN'T BE REFILLED (needs fixing asap)
${printOutdated(outdated.filter(p => !p[2]), maxLengthProtocolName, now)}`
}