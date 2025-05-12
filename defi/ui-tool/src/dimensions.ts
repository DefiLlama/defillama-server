
import loadAdaptorsData from "../../src/adaptors/data"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { getAllDimensionsRecordsTimeS } from "../../src/adaptors/db-utils/db2";
import { getTimestampString } from "../../src/api2/utils";
import { handler2, IStoreAdaptorDataHandlerEvent } from "../../src/adaptors/handlers/storeAdaptorData";
import PromisePool from '@supercharge/promise-pool';
import { humanizeNumber } from "@defillama/sdk";

const adapterTypes = Object.values(AdapterType)

const ONE_DAY_IN_SECONDS = 24 * 60 * 60

const recordItems: any = {}

export const dimensionFormChoices: any = {
  adapterTypes,
  adapterTypeChoices: {},
}

adapterTypes.forEach((adapterType: any) => {
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
  const protocolNames = new Set([protocolToRun])
  if (checkBeforeInsert) args.dryRun = true

  const { protocolAdaptors, } = loadAdaptorsData(adapterType as AdapterType)
  let protocol = protocolAdaptors.find(p => p.displayName === protocolToRun || p.module === protocolToRun || p.id === protocolToRun)

  if (!protocol) {
    console.error('Protocol not found')
    return;
  }

  if (fromTimestamp > toTimestamp) {
    console.error('Invalid date range. Start date should be less than end date.')
    return;
  }


  let i = 0
  const items: any = []
  let timeSWithData = new Set()
  let days = getDaysBetweenTimestamps(fromTimestamp, toTimestamp)


  if (args.onlyMissing) {


    const allTimeSData = await getAllDimensionsRecordsTimeS({ adapterType: adapterType as any, id: protocol.id2 })
    timeSWithData = new Set(allTimeSData.map((d: any) => d.timeS))
    allTimeSData.sort((a: any, b: any) => a.timestamp - b.timestamp)
    let firstTimestamp = allTimeSData[0]?.timestamp
    let lastTimestamp = allTimeSData[allTimeSData.length - 1]?.timestamp

    if (allTimeSData.length < 3) return;
    do {
      const currentTimeS = getTimestampString(lastTimestamp)
      if (!timeSWithData.has(currentTimeS)) {
        console.log('missing data on', new Date((lastTimestamp) * 1000).toLocaleDateString())
        const eventObj: IStoreAdaptorDataHandlerEvent = {
          timestamp: lastTimestamp,
          adapterType: adapterType as any,
          isDryRun: args.dryRun,
          protocolNames,
          isRunFromRefillScript: true,
          checkBeforeInsert,
        }
        items.push(eventObj)
      }
      lastTimestamp -= ONE_DAY_IN_SECONDS
    } while (lastTimestamp > firstTimestamp)


  } else {

    let currentDayEndTimestamp = toTimestamp

    while (days >= 0) {
      const eventObj: IStoreAdaptorDataHandlerEvent = {
        timestamp: currentDayEndTimestamp,
        adapterType: adapterType as any,
        isDryRun: args.dryRun,
        protocolNames,
        isRunFromRefillScript: true,
        checkBeforeInsert,
      }
      items.push(eventObj)

      days--
      currentDayEndTimestamp -= ONE_DAY_IN_SECONDS
    }

  }

  const { errors } = await PromisePool
    .withConcurrency(args.parallelCount)
    .for(items)
    .process(async (eventObj: any) => {

      console.log(++i, 'refilling data on', new Date((eventObj.timestamp) * 1000).toLocaleDateString())
      const response = await handler2(eventObj)
      if (checkBeforeInsert && response?.length)
        response.forEach((r: any) => {
          if (!r) return;
          recordItems[r.id] = r
        })
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
      if (recordItems[id]) delete recordItems[id]  // sometimes users double click or the can trigger this multiple times
      const { storeRecordV2Function, storeDDBFunctions } = record as any
      if (storeRecordV2Function) await storeRecordV2Function()
      if (storeDDBFunctions?.length) await Promise.all(storeDDBFunctions.map((fn: any) => fn()))
      delete recordItems[id]
    })

  if (errors.length > 0) {
    console.log('Errors storing data in db:', errors.length)
    console.error(errors)
  }
  console.log('all records are stored');
  sendWaitingRecords(ws)
}

function sendWaitingRecords(ws: any) {
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