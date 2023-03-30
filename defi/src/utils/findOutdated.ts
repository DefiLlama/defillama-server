import { hourlyTvl, getLastRecord } from "./getLastRecord";
import protocols from "../protocols/data";
import { toUNIXTimestamp } from "./date";
import { util } from "@defillama/sdk";
import { importAdapter } from "./imports/importAdapter";

const { humanizeNumber: { humanizeNumber, } } = util

function humanizeTimeDifference(timeDelta: number) {
  const hours = (timeDelta) / 3600
  if (hours <= 24) {
    return `(${Math.round(hours)} hours ago)`
  } else {
    return `(${Math.round(hours / 24)} days ago)`
  }
}

type InfoProtocol = {
  time: number,
  tvl: number
} | null

function printOutdated(outdated: [string, InfoProtocol, boolean][], maxLengthProtocolName: number, now:number) {
  return outdated.sort((a, b) => {
    if (a[1] === null) {
      return 1
    } else if (b[1] === null) {
      return -1
    } else {
      return a[1].time - b[1].time
    }
  }).map(line => {
    line[0] = line[0].padEnd(maxLengthProtocolName);
    let text: string
    if (line[1] === null) {
      text = "No TVL"
    } else {
      text = `Last update: ${new Date(line[1].time * 1000).toDateString()} ${humanizeTimeDifference(now - line[1].time)} - ${humanizeNumber(line[1].tvl)}`
    }
    return `${line[0]} - ${text}`;
  }).join('\n')
}

export async function getOutdated(maxDrift: number){
  const now = toUNIXTimestamp(Date.now());
  const outdated = [] as [string, InfoProtocol, boolean][];
  await Promise.all(protocols.map(async protocol => {
    const item = await getLastRecord(hourlyTvl(protocol.id));
    let text: InfoProtocol;
    if (item === undefined) {
      text = null
    } else if (item.SK < (now - maxDrift)) {
      text = {
        time: item.SK,
        tvl: item.tvl
      }
    } else {
      return
    }
    const module = await importAdapter(protocol)
    const refillable = !(module.fetch || module.timetravel === false)
    outdated.push([protocol.name, text, refillable])
  }))
  return outdated
}

export function buildOutdatedMessage(outdated: [string, InfoProtocol, boolean][]){
  const now = toUNIXTimestamp(Date.now());
  if (outdated.length === 0) {
    return null
  }
  const maxLengthProtocolName = outdated.reduce((max, line) => Math.max(max, line[0].length), 0)
  return `REFILLABLE
${printOutdated(outdated.filter(p => p[2]), maxLengthProtocolName, now)}

CAN'T BE REFILLED (needs fixing asap)
${printOutdated(outdated.filter(p => !p[2]), maxLengthProtocolName, now)}`
}

export default async function findOutdated(maxDrift: number) {
  const outdated = await getOutdated(maxDrift);
  return buildOutdatedMessage(outdated)
}