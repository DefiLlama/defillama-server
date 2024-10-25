import { hourlyTvl, getLastRecord, dailyTvl } from "./getLastRecord";
import protocols from "../protocols/data";
import treasuries from "../protocols/treasury";
import { toUNIXTimestamp } from "./date";
import { util } from "@defillama/sdk";
import { importAdapter } from "./imports/importAdapter";
import { getLatestProtocolItems, initializeTVLCacheDB } from "../api2/db";

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

function printOutdated(outdated: [string, InfoProtocol, boolean, number][], maxLengthProtocolName: number, now: number) {
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

const _getLatestTvl = async (protocol: any) => getLastRecord(hourlyTvl(protocol.id))

export async function getOutdated(maxDrift: number, getLatestTvl = _getLatestTvl) {
  const now = toUNIXTimestamp(Date.now());
  const outdated = [] as [string, InfoProtocol, boolean, number][];
  await Promise.all(protocols.concat(treasuries).map(async (protocol, index) => {
    if (protocol.rugged === true || protocol.module === "dummy.js") {
      return
    }
    const item = await getLatestTvl(protocol);
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
    if (module.deadFrom) {
      return
    }
    const refillable = !(module.fetch || module.timetravel === false)
    outdated.push([protocol.name, text, refillable, index])
  }))
  return outdated
}

export function buildOutdatedMessage(outdated: [string, InfoProtocol, boolean, number][]) {
  const now = toUNIXTimestamp(Date.now());
  if (outdated.length === 0) {
    return null
  }
  const maxLengthProtocolName = outdated.reduce((max, line) => Math.max(max, line[0].length), 0)
  return `REFILLABLE
${printOutdated(outdated.filter(p => p[2]).slice(0, 25), maxLengthProtocolName, now)}
${outdated.filter(p => p[2]).length > 25 ? `... and ${outdated.filter(p => p[2]).length - 25} more` : ""}

CAN'T BE REFILLED (needs fixing asap)
${printOutdated(outdated.filter(p => !p[2]).slice(0, 25), maxLengthProtocolName, now)}
${outdated.filter(p => !p[2]).length > 25 ? `... and ${outdated.filter(p => !p[2]).length - 25} more` : ""}`

}

export default async function findOutdated(maxDrift: number) {
  const outdated = await findOutdatedPG(maxDrift);
  return buildOutdatedMessage(outdated)
}

export async function findOutdatedPG(maxDrift: number) {
  await initializeTVLCacheDB()
  const latestProtocolItems = await getLatestProtocolItems(hourlyTvl, { filterLast24Hours: true })
  const latestProtocolItemsDaily = await getLatestProtocolItems(dailyTvl)
  const latestProtocolItemsMap: any = {}
  latestProtocolItems.forEach((data: any) => {
    latestProtocolItemsMap[data.id] = data.data
  })
  latestProtocolItemsDaily.forEach((data: any) => {
    if (!latestProtocolItemsMap[data.id])
      latestProtocolItemsMap[data.id] = data.data
  })
  return getOutdated(maxDrift, async (protocol: any) => latestProtocolItemsMap[protocol.id])
}