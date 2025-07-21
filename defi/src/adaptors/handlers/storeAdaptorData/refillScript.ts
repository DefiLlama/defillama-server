require("dotenv").config();

import '../../../api2/utils/failOnError'
import { Adapter, AdapterType } from "@defillama/dimension-adapters/adapters/types"
import loadAdaptorsData from "../../data"
import { handler2, IStoreAdaptorDataHandlerEvent } from "."
import readline from 'readline';
import { getAllDimensionsRecordsTimeS } from '../../db-utils/db2';
import { getTimestampString } from '../../../api2/utils';
import { ADAPTER_TYPES } from '../triggerStoreAdaptorData';
import PromisePool from '@supercharge/promise-pool';


// ================== Script Config ==================

console.log(process.env.type, process.env.protocol, process.env.to, process.env.from, process.env.days, process.env.dry_run, process.env.confirm)
let adapterType = process.env.type ?? AdapterType.DERIVATIVES
let protocolToRun = process.env.protocol ?? 'bluefin' // either protocol display name, module name or id

let toTimestamp: any = process.env.toTimestamp ?? process.env.to ?? '2024-11-30' // enable next line to run to now
// toTimestamp = Date.now()

let fromTimestamp: any = process.env.fromTimestamp ?? process.env.from ?? '2024-09-01' // enable next line to run from the dawn of time
// fromTimestamp = 0

let days = 0 // set to non zero to override date range to run for x days

if (process.env.days) days = parseInt(process.env.days)

let DRY_RUN = process.env.dry_run ? process.env.dry_run === 'true' : true
const SHOW_CONFIRM_DIALOG = process.env.confirm ? process.env.confirm === 'true' : false
const SHOW_CONFIG_TABLE = process.env.hide_config_table !== 'true'
let refillOnlyMissingData = process.env.refill_only_missing_data === 'true'
let refillAllProtocolsMissing = process.env.refill_all_missing_protocols === 'true'
let parallelCount = process.env.parallel_count ? parseInt(process.env.parallel_count) : 1
let storeInFile = process.env.store_in_file === 'true'
/* 
refillOnlyMissingData = true
protocolToRun = '4449'
adapterType = AdapterType.FEES
DRY_RUN = false
 */
let run = refillAdapter

if (refillAllProtocolsMissing)
  run = refillAllProtocols


// ================== Script Config end ==================

const ONE_DAY_IN_SECONDS = 24 * 60 * 60
async function refillAdapter() {

  console.log('\n\n\n\n\n')
  console.log('------------------------------------')

  fromTimestamp = getUnixTS(fromTimestamp)
  toTimestamp = getUnixTS(toTimestamp)

  if (fromTimestamp > toTimestamp) {
    console.error('Invalid date range. Start date should be less than end date.')
    return;
  }
  if (!Object.values(AdapterType).includes(adapterType as any)) {
    console.error('Invalid adapter type.', adapterType, ' valid types are:', Object.values(AdapterType))
    return;
  }
  const { protocolAdaptors, importModule } = loadAdaptorsData(adapterType as AdapterType)
  let protocol = protocolAdaptors.find(p => p.displayName === protocolToRun || p.module === protocolToRun || p.id === protocolToRun)

  if (!protocol) {
    console.error('Protocol not found')
    return;
  }

  protocolToRun = protocol.displayName
  const adaptor: Adapter = (await importModule(protocol.module)).default;
  const adapterVersion = adaptor.version
  const isVersion2 = adapterVersion === 2

  if (!days)
    days = getDaysBetweenTimestamps(fromTimestamp, toTimestamp)

  const configObj = {
    'Start date': new Date(fromTimestamp * 1000).toLocaleDateString(),
    'End date': new Date(toTimestamp * 1000).toLocaleDateString(),
    'No. of Days': days,
    'Adapter Type': adapterType,
    'Protocol to run': protocolToRun,
    'Dry Run': DRY_RUN,
    isVersion2,
  }

  if (SHOW_CONFIG_TABLE) {
    console.log('Script config: \n\n')
    console.table(configObj)
    console.log('\n\n')

    if (SHOW_CONFIRM_DIALOG) {
      const userInput = (await prompt('Do you want to continue? (y/n): '))?.toLowerCase();
      if (userInput !== 'y' && userInput !== 'yes')
        return;
    }
  }

  let i = 0
  const items: any = []
  let timeSWithData = new Set()



  if (refillOnlyMissingData) {


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
          isDryRun: DRY_RUN,
          protocolNames: new Set([protocolToRun]),
          isRunFromRefillScript: true,
        }
        items.push(eventObj)
      }
      lastTimestamp -= ONE_DAY_IN_SECONDS
    } while (lastTimestamp > firstTimestamp)


  } else {

    let currentDayEndTimestamp = toTimestamp
    // if (!isVersion2) currentDayEndTimestamp += ONE_DAY_IN_SECONDS 

    while (days > 0) {
      const eventObj: IStoreAdaptorDataHandlerEvent = {
        timestamp: currentDayEndTimestamp,
        adapterType: adapterType as any,
        isDryRun: DRY_RUN,
        protocolNames: new Set([protocolToRun]),
        isRunFromRefillScript: true,
      }
      items.push(eventObj)

      days--
      currentDayEndTimestamp -= ONE_DAY_IN_SECONDS
    }

  }

  await PromisePool
    .withConcurrency(parallelCount)
    .for(items)
    .process(async (eventObj: any) => {

      console.log(++i, 'refilling data on', new Date((eventObj.timestamp) * 1000).toLocaleDateString())
      await handler2(eventObj)
    })

}

function getUnixTS(i: any) {
  if (typeof i === 'string') {
    if (/^\d+$/.test(i)) {
      i = parseInt(i, 10);
    } else {
      const date = new Date(i.includes('T') ? i : `${i}T00:00:00Z`); // setting timezone as UTC
      return Math.floor(date.getTime() / 1000);
    }
  }
  if (typeof i === 'number') {
    return i > 9999999999 ? Math.floor(i / 1000) : i;
  } else {
    throw new Error('Invalid input type');
  }
}

function getDaysBetweenTimestamps(from: number, to: number): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const differenceInMilliseconds = (to * 1000) - (from * 1000);
  return Math.floor(differenceInMilliseconds / millisecondsPerDay);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function refillAllProtocols() {

  setTimeout(() => {
    console.error("Timeout reached, exiting from refillAllProtocols...")
    process.exit(1)
  }, 1000 * 60 * 60 * 4) // 4 hours
  let timeRange = 90 // 3 months
  const envTimeRange = process.env.refill_adapters_timeRange
  if (envTimeRange && !isNaN(+envTimeRange)) timeRange = +envTimeRange
  const startTime = Math.floor(Date.now() / 1000) - timeRange * 24 * 60 * 60
  const yesterday = Math.floor(Date.now() / 1000) - 24 * 60 * 60
  const adaptorDataMap: any = {}

  console.log('Refilling all protocols for last', timeRange, 'days')
  const aTypes = [...ADAPTER_TYPES]
  // randomize order
  aTypes.sort(() => Math.random() - 0.5)
  for (const adapterType of aTypes) {
    await runAdapterType(adapterType)
  }


  async function runAdapterType(adapterType: AdapterType) {
    const allAdaptorsData = await getAllDimensionsRecordsTimeS({ adapterType, timestamp: startTime })
    for (const data of allAdaptorsData) {
      if (!adaptorDataMap[data.id]) adaptorDataMap[data.id] = new Set()
      adaptorDataMap[data.id].add(data.timeS)
    }


    // Import data list to be used
    const dataModule = loadAdaptorsData(adapterType)
    // Import some utils
    let { protocolAdaptors } = dataModule

    // randomize the order of execution
    protocolAdaptors = protocolAdaptors.sort(() => Math.random() - 0.5)

    await PromisePool
      .withConcurrency(10)
      .for(protocolAdaptors)
      .process((protocol: any) => refillProtocol(protocol, adapterType))
  }

  async function refillProtocol(protocol: any, adapterType: AdapterType) {
    const protocolId = protocol.id2
    const protocolName = protocol.displayName
    const timeSWithData = adaptorDataMap[protocolId] || new Set()
    let currentDayEndTimestamp = yesterday
    let i = 0
    while (currentDayEndTimestamp > startTime) {
      const currentTimeS = getTimestampString(currentDayEndTimestamp)
      if (!timeSWithData.has(currentTimeS)) {
        console.log(++i, 'refilling data on', new Date((currentDayEndTimestamp) * 1000).toLocaleDateString(), 'for', protocolName, `[${adapterType}]`)
        const eventObj: IStoreAdaptorDataHandlerEvent = {
          timestamp: currentDayEndTimestamp,
          adapterType,
          isDryRun: false,
          protocolNames: new Set([protocolName]),
          isRunFromRefillScript: true,
          throwError: true,
        }
        await handler2(eventObj)
      }
      currentDayEndTimestamp -= ONE_DAY_IN_SECONDS
    }
  }
}

console.time('Script execution time')

run().catch(console.error).then(() => {
  console.timeEnd('Script execution time')
  process.exit(0)
})
