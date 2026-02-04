import { hourlyTvl, getLastRecord, dailyTvl } from "./getLastRecord";
import protocols from "../protocols/data";
import treasuries from "../protocols/treasury";
import { toUNIXTimestamp } from "./date";
import { util } from "@defillama/sdk";
import { importAdapter } from "./imports/importAdapter";
import { getLatestProtocolItems, initializeTVLCacheDB } from "../api2/db";

const { humanizeNumber: { humanizeNumber, }, tableToString } = util

function humanizeTimeDifference(timeDelta: number) {
  const hours = (timeDelta) / 3600
  if (hours <= 24) {
    return `${Math.round(hours)} hours`
  } else {
    return `${Math.round(hours / 24)} days`
  }
}

type InfoProtocol = {
  time: number,
  tvl: number
} | null

function printOutdated(outdated: OutdatedData[], { title, now = toUNIXTimestamp(Date.now()), maxLengthProtocolName = 31 }: { title?: string, now?: number, maxLengthProtocolName?: number } = {}) {
  const sorted = outdated.sort((a, b) => {
    if (!a.lastUpdate) {
      return 1
    } else if (!b.lastUpdate) {
      return -1
    } else {
      return a!.lastUpdate - b!.lastUpdate
    }
  })
  const tableData = sorted.map((data) => {
    const res: any = {}
    if (data.protocolName.length > maxLengthProtocolName) data.protocolName = data.protocolName.slice(0, maxLengthProtocolName - 3) + '...'
    res.Name = data.protocolName
    res['Last Update'] = data.lastUpdate ? humanizeTimeDifference(now - data.lastUpdate) : '-'
    res['Tvl'] = data.tvl ? humanizeNumber(data.tvl) : 'No TVL'
    return res
  })

  return tableToString(tableData, { title, columns: ['Name', 'Last Update', 'Tvl'] })
}

const _getLatestTvl = async (protocol: any) => getLastRecord(hourlyTvl(protocol.id))

type OutdatedData = {
  protocolName: string,
  lastUpdate?: number, // unix timestamp
  tvl?: number,
  refillable: boolean,
  runIndex: number, // not used anywhere
}

export async function getOutdated(maxDrift: number, getLatestTvl: any, options: { categories?: string[] } = {}) {
  if (!getLatestTvl) throw new Error("getLatestTvl is required")

  const now = toUNIXTimestamp(Date.now());
  const outdated = [] as OutdatedData[];
  await Promise.all(protocols.concat(treasuries).map(async (protocol, index) => {
    if (options.categories && protocol.category && !options.categories.includes(protocol.category)) {
      return
    }
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
    const module = importAdapter(protocol)
    if (module.deadFrom) {
      return
    }


    const ignoredSet = new Set(['Synthetix', 'Defi Saver']);
    if (ignoredSet.has(protocol.name))
      return;



    const refillable = !(module.fetch || module.timetravel === false)
    outdated.push({
      protocolName: protocol.name,
      lastUpdate: text?.time,
      tvl: text?.tvl,
      refillable,
      runIndex: index,
    })
  }))
  return outdated
}

export function buildOutdatedMessage(outdated: OutdatedData[]) {
  if (outdated.length === 0) {
    return null
  }
  const maxDisplay = 101
  const logViewer = process.env.LOG_VIEWER_URL

  const responseStrings = [
    printOutdated(outdated.slice(0, maxDisplay)),
    outdated.length > maxDisplay ? `... and ${outdated.length - maxDisplay} more` : "",
    logViewer ? `Check error logs at ${logViewer}` : ""
  ]

  return responseStrings.filter(i => i?.length).join('\n')
}

export default async function findOutdated(maxDrift: number) {
  const outdated = await findOutdatedPG(maxDrift);
  return buildOutdatedMessage(outdated)
}

export async function findOutdatedPG(maxDrift: number, options: { categories?: string[] } = {}) {
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
  return getOutdated(maxDrift, async (protocol: any) => latestProtocolItemsMap[protocol.id], options)
}