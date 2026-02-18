import loadAdaptorsData from "../../src/adaptors/data"
import { AdapterType } from "../../src/adaptors/data/types";
import { getAllDimensionsRecordsTimeS, getDimensionsRecordsInRange } from "../../src/adaptors/db-utils/db2";
import { AdapterRecord2 } from "../../src/adaptors/db-utils/AdapterRecord2";
import { getTimestampString } from "../../src/api2/utils";
import { handler2, DimensionRunOptions } from "../../src/adaptors/handlers/storeAdaptorData";
import PromisePool from '@supercharge/promise-pool';
import { humanizeNumber } from "@defillama/sdk";
import { ADAPTER_TYPES } from "../../src/adaptors/data/types";
import sleep from "../../src/utils/shared/sleep";
import { getTimestampAtStartOfDayUTC } from "../../src/utils/date";

const ONE_DAY_IN_SECONDS = 24 * 60 * 60

const recordItems: any = {}

export const dimensionFormChoices: any = {
  adapterTypes: ADAPTER_TYPES,
  adapterTypeChoices: {},
}

ADAPTER_TYPES.forEach((adapterType: any) => {
  const { protocolAdaptors } = loadAdaptorsData(adapterType)
  dimensionFormChoices.adapterTypeChoices[adapterType] = protocolAdaptors.map((p: any) => p.displayName)
})

export async function runDimensionsRefill(ws: any, args: any) {
  const start = +new Date()
  process.env.AWS_REGION = process.env.AWS_REGION || 'eu-central-1'
  process.env.tableName = process.env.tableName || 'prod-table'

  let fromTimestamp = args.dateFrom
  let toTimestamp = args.dateTo
  const adapterType = args.adapterType
  const protocolToRun = args.protocol
  const checkBeforeInsert = args.checkBeforeInsert
  const delayBetweenRuns = args.delayBetweenRuns ?? 0
  const parallelHourlyProcessCount = args.parallelHourlyProcessCount ?? 1
  const skipHourlyCache = !!args.skipHourlyCache
  const protocolNames = new Set([protocolToRun])
  if (checkBeforeInsert) args.dryRun = true

  if (delayBetweenRuns)
    console.log(`Delay between runs is set to ${delayBetweenRuns} seconds`)

  // const endOfToday = getTimestampAtStartOfDayUTC(Math.floor(Date.now() / 1000)) + ONE_DAY_IN_SECONDS - 1
  // // skip if end date is in the future
  // if (toTimestamp > endOfToday)
  //   toTimestamp = endOfToday

  const { protocolAdaptors, } = loadAdaptorsData(adapterType as AdapterType)
  let protocol = protocolAdaptors.find(p => p.displayName === protocolToRun || p.module === protocolToRun || p.id === protocolToRun)

  if (!protocol) {
    throw new Error(`Protocol "${protocolToRun}" not found for adapter type "${adapterType}"`)
  }

  if (fromTimestamp > toTimestamp) {
    console.error('Invalid date range. Start date should be less than end date.')
    return;
  }

  let i = 0
  let items: DimensionRunOptions[] = []
  let timeSWithData = new Set()
  let days = getDaysBetweenTimestamps(fromTimestamp, toTimestamp)

  if (args.onlyMissing) {
    const allTimeSData = await getAllDimensionsRecordsTimeS({ adapterType: adapterType as any, id: protocol.id2 })
    console.log('existing records in db:', allTimeSData.length)
    timeSWithData = new Set(allTimeSData.map((d: any) => d.timeS))
    allTimeSData.sort((a: any, b: any) => a.timestamp - b.timestamp)
    let firstTimestamp = allTimeSData[0]?.timestamp
    let lastTimestamp = allTimeSData[allTimeSData.length - 1]?.timestamp

    if (allTimeSData.length < 3) return;
    do {
      const currentTimeS = getTimestampString(lastTimestamp)
      if (!timeSWithData.has(currentTimeS)) {
        console.log('missing data on', new Date((lastTimestamp) * 1000).toLocaleDateString())
        const eventObj: DimensionRunOptions = {
          timestamp: lastTimestamp,
          adapterType: adapterType as any,
          isDryRun: args.dryRun,
          protocolNames,
          isRunFromRefillScript: true,
          checkBeforeInsert,
          skipHourlyCache,
          parallelHourlyProcessCount,
        }
        items.push(eventObj)
      }
      lastTimestamp -= ONE_DAY_IN_SECONDS
    } while (lastTimestamp > firstTimestamp)
  } else {
    let currentDayEndTimestamp = toTimestamp

    while (days >= 0) {
      const eventObj: DimensionRunOptions = {
        timestamp: currentDayEndTimestamp,
        adapterType: adapterType as any,
        isDryRun: args.dryRun,
        protocolNames,
        isRunFromRefillScript: true,
        checkBeforeInsert,
        skipHourlyCache,
        parallelHourlyProcessCount,
      }
      items.push(eventObj)

      days--
      currentDayEndTimestamp -= ONE_DAY_IN_SECONDS
    }
  }
  let consoleDelayCounter = 0

  const { errors } = await PromisePool
    .withConcurrency(args.parallelCount)
    .for(items)
    .process(async (eventObj: any) => {
      console.log(++i, 'refilling data on', new Date((eventObj.timestamp) * 1000).toLocaleDateString())
      const response = await handler2(eventObj)
      if (delayBetweenRuns > 0) {
        consoleDelayCounter++
        if (consoleDelayCounter < 3)
          console.log(`Waiting for ${delayBetweenRuns} seconds before next run...`)
        await sleep(delayBetweenRuns * 1000)
      }
      if (checkBeforeInsert && response?.length)
        response.forEach((r: any) => {
          if (!r) return;
          recordItems[r.id] = r
        })
      sendWaitingRecords(ws)
    })

  const runTime = ((+(new Date) - start) / 1e3).toFixed(1)
  console.log(`[Done] | runtime: ${runTime}s  `)
  if (errors.length > 0) {
    console.log('Errors:', errors.length)
    console.error(errors)
  }

  if (checkBeforeInsert) {
    console.log('Dry run, no data was inserted')
    sendWaitingRecords(ws)
  }
}

function getDaysBetweenTimestamps(from: number, to: number): number {
  return Math.round((to - from) / ONE_DAY_IN_SECONDS)
}

export function removeWaitingRecords(ws: any, ids: any) {
  if (Array.isArray(ids))
    ids.forEach((id: any) => delete recordItems[id])
  sendWaitingRecords(ws)
}

export async function storeAllWaitingRecords(ws: any) {
  const allRecords = Object.entries(recordItems)
  // randomize the order of the records
  allRecords.sort(() => Math.random() - 0.5)

  const { errors } = await PromisePool
    .withConcurrency(11)
    .for(allRecords)
    .process(async ([id, record]: any) => {
      // if (recordItems[id]) delete recordItems[id]  // sometimes users double click or the can trigger this multiple times
      const { storeFunctions } = record as any
      if (storeFunctions?.length) await Promise.all(storeFunctions.map((f: any) => f()))
      delete recordItems[id]
    })

  if (errors.length > 0) {
    console.log('Errors storing data in db:', errors.length)
    console.error(errors)
  }
  console.log('all records are stored');
  sendWaitingRecords(ws)
}

export function sendWaitingRecords(ws: any) {
  ws.send(JSON.stringify({
    type: 'waiting-records',
    data: Object.values(recordItems).map(getRecordItem),
  }))
}

function getRecordItem(record: any) {
  const { id, protocolName, timeS, recordV2, adapterType } = record
  const res: any = {
    id,
    protocolName,
    timeS,
    adapterType,
  }
  try {
    Object.entries(recordV2.data.aggregated).forEach(([key, data]: any) => {
      res[key] = humanizeNumber(data.value)
      res['_' + key] = +data.value
      if (data.chains) {
        Object.entries(data.chains).forEach(([chain, value]: any) => {
          res[`${key}_${chain}`] = humanizeNumber(value)
          res[`_${key}_${chain}`] = value
        })
      }
    })
  } catch (e) {
    console.error('Error parsing record data', e)
  }
  return res
}

// --- Dimension Delete Functionality ---

const deleteRecordsList: any = {}

export async function dimensionsDeleteGetList(ws: any, args: any) {
  const adapterType = args.adapterType as AdapterType
  const protocolToRun = args.protocol
  const fromTimestamp = Number(args.dateFrom)
  const toTimestamp = Number(args.dateTo)

  if (!Number.isFinite(fromTimestamp) || !Number.isFinite(toTimestamp)) {
    console.error('Invalid timestamp range: fromTimestamp and toTimestamp must be finite numbers')
    return
  }

  if (fromTimestamp > toTimestamp) {
    console.error('Invalid timestamp range: fromTimestamp must be <= toTimestamp')
    return
  }

  const { protocolAdaptors } = loadAdaptorsData(adapterType)
  const protocol = protocolAdaptors.find((p: any) => p.displayName === protocolToRun || p.module === protocolToRun || p.id === protocolToRun)

  if (!protocol) {
    console.error(`Protocol "${protocolToRun}" not found for adapter type "${adapterType}"`)
    return
  }

  const records = await getDimensionsRecordsInRange({ adapterType, id: protocol.id2, fromTimestamp, toTimestamp })

  console.log('Pulled', records.length, 'dimension records for protocol:', protocol.displayName, 'type:', adapterType, 'from:', new Date(fromTimestamp * 1000).toDateString(), 'to:', new Date(toTimestamp * 1000).toDateString())

  records.forEach((record: any) => {
    const uniqueId = `${adapterType}#${record.id}#${record.timeS}`
    deleteRecordsList[uniqueId] = {
      id: uniqueId,
      protocolId: record.id,
      protocolName: protocol.displayName,
      adapterType,
      timeS: record.timeS,
      timestamp: record.timestamp,
      data: record.data,
    }
  })

  sendDimensionsDeleteWaitingRecords(ws)
}

export async function dimensionsDeleteSelectedRecords(ws: any, ids: any) {
  await _deleteDimensionRecords(ws, ids)
}

export async function dimensionsDeleteAllRecords(ws: any) {
  await _deleteDimensionRecords(ws)
}

async function _deleteDimensionRecords(ws: any, ids?: any) {
  if (!ids) ids = Object.keys(deleteRecordsList)
  if (!ids.length) return

  const validIds = ids.filter((id: string) => deleteRecordsList[id])
  if (validIds.length === 0) {
    console.error('No valid records found for deletion')
    return
  }

  if (validIds.length !== ids.length) {
    console.error(`Warning: ${ids.length - validIds.length} invalid IDs were filtered out`)
  }

  validIds.sort(() => Math.random() - 0.5)

  const { errors } = await PromisePool
    .withConcurrency(7)
    .for(validIds)
    .process(async (id: any) => {
      const record = deleteRecordsList[id]
      if (!record) {
        console.error('Record not found in deleteRecordsList:', id)
        return
      }

      const { protocolId, adapterType, timeS, timestamp, data, bl, blc } = record

      try {
        // TODO: uncomment to enable actual deletion
        await AdapterRecord2.deleteFromDB({ adapterType, id: protocolId, timeS, timestamp, data, bl, blc })
        // console.log('[DRY RUN] Would delete dimension record:', adapterType, protocolId, timeS, 'data:', JSON.stringify(record.data?.aggregated ?? {}))
        delete deleteRecordsList[id]
      } catch (e) {
        console.error('Error deleting dimension record:', id, (e as any)?.message || e)
        throw e
      }
    })

  if (errors.length > 0) {
    console.error('Errors deleting dimension records:', errors.length, errors.map((e: any) => e.message || e))
  }

  sendDimensionsDeleteWaitingRecords(ws)
}

export function dimensionsDeleteClearList(ws: any) {
  console.log('Clearing dimension delete records list', Object.keys(deleteRecordsList).length)
  Object.keys(deleteRecordsList).forEach((id) => delete deleteRecordsList[id])
  sendDimensionsDeleteWaitingRecords(ws)
}

export function sendDimensionsDeleteWaitingRecords(ws: any) {
  ws.send(JSON.stringify({
    type: 'dimensions-delete-waiting-records',
    data: Object.values(deleteRecordsList).map(getDeleteRecordItem),
  }))
}

function getDeleteRecordItem(record: any) {
  const { id, protocolName, timeS, adapterType, data } = record
  const res: any = {
    id,
    protocolName,
    timeS,
    adapterType,
  }
  try {
    if (data?.aggregated) {
      Object.entries(data.aggregated).forEach(([key, d]: any) => {
        res[key] = humanizeNumber(d.value)
        res['_' + key] = +d.value
        if (d.chains) {
          Object.entries(d.chains).forEach(([chain, value]: any) => {
            res[`${key}_${chain}`] = humanizeNumber(value)
            res[`_${key}_${chain}`] = value
          })
        }
      })
    }
  } catch (e) {
    console.error('Error parsing delete record data', e)
  }
  return res
}