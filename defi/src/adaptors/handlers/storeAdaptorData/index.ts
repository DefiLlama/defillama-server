import { Adapter, AdapterType, BaseAdapter, } from "@defillama/dimension-adapters/adapters/types";
import runAdapter from "@defillama/dimension-adapters/adapters/utils/runAdapter";
import { getBlock } from "@defillama/dimension-adapters/helpers/getBlock";
import { elastic } from '@defillama/sdk';
import { humanizeNumber, } from "@defillama/sdk/build/computeTVL/humanizeNumber";
import { Chain } from "@defillama/sdk/build/general";
import { PromisePool } from '@supercharge/promise-pool';
import { getUnixTimeNow } from "../../../api2/utils/time";
import { getTimestampAtStartOfDayUTC, getTimestampAtStartOfHour } from "../../../utils/date";
import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import loadAdaptorsData from "../../data";
import { ProtocolAdaptor, } from "../../data/types";
import { AdapterRecord2, } from "../../db-utils/AdapterRecord2";
import { AdaptorRecord, AdaptorRecordType, RawRecordMap, storeAdaptorRecord } from "../../db-utils/adaptor-record";
import { storeAdapterRecord } from "../../db-utils/db2";
import canGetBlock from "../../utils/canGetBlock";
import { sendDiscordAlert } from "../../utils/notify";
import { processFulfilledPromises, } from "./helpers";


// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours
const timestampAtStartofHour = getTimestampAtStartOfHour(Math.trunc((Date.now()) / 1000))
const timestampAnHourAgo = timestampAtStartofHour - 2 * 60 * 60

export interface IHandlerEvent {
  protocolModules: string[]
  timestamp?: number
  adaptorType: AdapterType
  chain?: Chain
  adaptorRecordTypes?: string[]
  protocolVersion?: string
}


export const handler = async (event: IHandlerEvent) => {
  return handler2({
    timestamp: event.timestamp,
    adapterType: event.adaptorType,
    protocolNames: event.protocolModules ? new Set(event.protocolModules) : undefined,
  })
};

export default wrapScheduledLambda(handler);

export type IStoreAdaptorDataHandlerEvent = {
  timestamp?: number
  adapterType: AdapterType
  protocolNames?: Set<string>
  maxConcurrency?: number
  isDryRun?: boolean
  isRunFromRefillScript?: boolean
  yesterdayIdSet?: Set<string>
  todayIdSet?: Set<string>
  runType?: 'store-all' | 'default'
  throwError?: boolean
}

const ONE_DAY_IN_SECONDS = 24 * 60 * 60

export const handler2 = async (event: IStoreAdaptorDataHandlerEvent) => {
  const defaultMaxConcurrency = 10
  let { timestamp = timestampAnHourAgo, adapterType, protocolNames, maxConcurrency = defaultMaxConcurrency, isDryRun = false, isRunFromRefillScript = false,
    runType = 'default', yesterdayIdSet = new Set(), todayIdSet = new Set(),
    throwError = false,

  } = event
  if (!isRunFromRefillScript)
    console.info(`- Date: ${new Date(timestamp! * 1e3).toDateString()} (timestamp ${timestamp})`)
  // Get clean day
  let toTimestamp: number
  let fromTimestamp: number

  // I didnt want to touch existing implementation that affects other scripts, but it looks like it is off by a day if we store it at the end of the time range (which is next day 00:00 UTC)
  if (isRunFromRefillScript) {
    fromTimestamp = getTimestampAtStartOfDayUTC(timestamp!)
    toTimestamp = fromTimestamp + ONE_DAY_IN_SECONDS - 1

    if (toTimestamp * 1000 > Date.now()) {
      console.info(`[${adapterType}] - cant refill data for today, it's not over yet`)
      return;
    }

  } else if (runType === 'store-all') {
    fromTimestamp = timestampAnHourAgo - ONE_DAY_IN_SECONDS
    toTimestamp = fromTimestamp + ONE_DAY_IN_SECONDS - 1
  }

  if (!toTimestamp!) throw new Error('toTimestamp is not set')

  const _debugTimeStart = Date.now()

  // Import data list to be used
  const dataModule = loadAdaptorsData(adapterType)
  // Import some utils
  const { importModule, KEYS_TO_STORE, config, protocolAdaptors } = dataModule
  const configIdMap: any = {}
  Object.entries(config).forEach(([key, i]) => {
    const id = config[key].isChain ? 'chain#' + i.id : i.id
    configIdMap[id] = i
  })

  // Get list of adaptors to run
  let protocols = protocolAdaptors

  // Filter adaptors
  protocols = protocols.filter(p => !protocolNames || protocolNames.has(p.displayName) || protocolNames.has(p.module))
  // randomize the order of execution
  protocols = protocols.sort(() => Math.random() - 0.5)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = protocols.reduce((acc, { chains }) => {
    acc.push(...chains as Chain[])
    return acc
  }, [] as Chain[]).filter(canGetBlock)
  await Promise.all(
    allChains.map(async (chain) => {
      try {
        await getBlock(toTimestamp, chain, {}).catch((e: any) => console.error(`${e.message}; ${toTimestamp}, ${chain}`))
      } catch (e) { console.log('error fetching block, chain:', chain, (e as any)?.message) }
    })
  );

  // const timeTable: any = []
  const { errors, results } = await PromisePool
    .withConcurrency(maxConcurrency)
    .for(protocols)
    .onTaskFinished((item: any, _: any) => {
      if (!isRunFromRefillScript)
        console.info(`[${adapterType}] - ${item.module} done!`)
    })
    .process(runAndStoreProtocol)

  const shortenString = (str: string, length: number = 250) => {
    if (typeof str !== 'string') str = JSON.stringify(str)
    if (str === undefined) return `undefined`
    return str.length > length ? str.slice(0, length) + '...' : str
  }

  const errorObjects = errors.map(({ raw, item, message }: any) => {
    return {
      adapter: `${item.name} - ${item.versionKey ?? ''}`,
      message: shortenString(message),
      chain: raw.chain,
      // stack: raw.stack?.split('\n').slice(1, 2).join('\n')
    }
  })


  const debugTimeEnd = Date.now()
  const notificationType = 'dimensionLogs'
  const timeTakenSeconds = Math.floor((debugTimeEnd - _debugTimeStart) / 1000)

  if (!isRunFromRefillScript) {
    console.info(`Success: ${results.length} Errors: ${errors.length} Time taken: ${timeTakenSeconds}s`)
    await sendDiscordAlert(`[${adapterType}] Success: ${results.length} Errors: ${errors.length} Time taken: ${timeTakenSeconds}`, notificationType)
  }


  if (errorObjects.length) {
    const logs = errorObjects.map(({ adapter, message, chain }, i) => `${i} ${adapter} - ${message} - ${chain}`)
    const headers = ['Adapter', 'Error Message', 'Chain'].join(' - ')
    logs.unshift(headers)

    if (!isRunFromRefillScript)
      await sendDiscordAlert(logs.join('\n'), notificationType, true)
    console.table(errorObjects)
  }

  if (throwError && errorObjects.length) 
    throw new Error('Errors found')
  // console.log(JSON.stringify(errorObjects, null, 2))
  /* console.log(` ${adapterType} Success: ${results.length} Errors: ${errors.length} Time taken: ${timeTakenSeconds}s`)
  console.table(timeTable) */

  console.info(`**************************`)

  async function runAndStoreProtocol(protocol: ProtocolAdaptor, index: number) {
    // if (protocol.module !== 'mux-protocol') return;
    if (!isRunFromRefillScript)
      console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module}`)


    const startTime = getUnixTimeNow()
    const metadata = {
      application: "dimensions",
      type: 'protocol',
      name: protocol.module,
      subType: adapterType,
    }

    let success = true
    let refillYesterdayPromise = undefined
    let errorObject: any
    // Get adapter info
    let { id, id2, module, } = protocol;
    // console.info(`Adapter found ${id} ${module} ${versionKey}`)

    try {
      // Import adaptor
      const adaptor: Adapter = (await importModule(module)).default;
      // if an adaptor is expensive and no timestamp is provided, we try to avoid running every hour, but only from 21:55 to 01:55
      const adapterVersion = adaptor.version ?? 1
      const isAdapterVersionV1 = adapterVersion !== 2

      if (adaptor.deadFrom) {
        console.log(`Skipping ${adapterType}- ${module} - deadFrom: ${adaptor.deadFrom}`)
        return;
      }

      let endTimestamp = toTimestamp
      let recordTimestamp = toTimestamp
      if (isRunFromRefillScript) recordTimestamp = fromTimestamp // when we are storing data, irrespective of version, store at start timestamp while running from refill script? 
      // I didnt want to touch existing implementation that affects other scripts, but it looks like it is off by a day if we store it at the end of the time range (which is next day 00:00 UTC) - this led to record being stored on the next day of the 24 hour range?


      // Get list of adapters to run
      const adaptersToRun: [string, BaseAdapter][] = []
      if ("adapter" in adaptor) {
        adaptersToRun.push([module, adaptor.adapter])
      } else if ("breakdown" in adaptor) {
        const dexBreakDownAdapter = adaptor.breakdown
        const breakdownAdapters = Object.entries(dexBreakDownAdapter)
        for (const [version, adapter] of breakdownAdapters) {
          adaptersToRun.push([version, adapter]) // the version is the key for the record (like uni v2) not the version of the adapter
        }
      } else
        throw new Error("Invalid adapter")

      let runAtCurrTime = adaptersToRun.some(([_version, adapter]) => Object.values(adapter).some(a => a.runAtCurrTime))

      if (isRunFromRefillScript && runAtCurrTime) {
        if (Date.now() - fromTimestamp * 1000 > 1000 * 60 * 60 * 24) {
          throw new Error(`${adapterType} - ${module} - runAtCurrTime is set, but the refill script is running for more than 24 hours`)
        }
      }

      if (runType === 'store-all') {

        const date = new Date()
        const hours = date.getUTCHours()
        const isExpensiveAdapter = adaptor.isExpensiveAdapter
        // if it is an expensive adapter run every 4 hours or after 20:00 UTC
        const runNow = !isExpensiveAdapter || (hours % 4 === 0 || hours > 20)
        const haveTodayData = todayIdSet.has(id2)
        const haveYesterdayData = yesterdayIdSet.has(id2)
        const yesterdayEndTimestamp = getTimestampAtStartOfDayUTC(Math.floor(Date.now() / 1000)) - 1


        if (runAtCurrTime || !isAdapterVersionV1) {
          recordTimestamp = timestampAtStartofHour
          endTimestamp = timestampAtStartofHour

          // check if data for yesterday is missing for v2 adapter and attemp to refill it if refilling is supported
          if (!runAtCurrTime && !haveYesterdayData) {
            console.info(`Refill ${adapterType} - ${protocol.module} - missing yesterday data, attempting to refill`)
            try {
              refillYesterdayPromise = handler2({
                timestamp: yesterdayEndTimestamp,
                adapterType,
                protocolNames: new Set([protocol.displayName]),
                isRunFromRefillScript: true,
              })
            } catch (e) {
              console.error(`Error refilling ${adapterType} - ${protocol.module} - ${(e as any)?.message}`)
            }
          }

          if (haveTodayData && !runNow) {
            console.info(`Skipping ${adapterType} - ${protocol.module} - already have today data for adapter running at current time`)
            return;
          }
        } else { // it is a version 1 adapter - we pull yesterday's data
          if (haveYesterdayData) {
            console.info(`Skipping ${adapterType} - ${protocol.module} already have yesterday data`)
            return;
          }

          endTimestamp = yesterdayEndTimestamp
          recordTimestamp = getTimestampAtStartOfDayUTC(endTimestamp)
        }

        /*  timeTable.push({
           module: protocol.module,
           timeS: getTimestampString(recordTimestamp),
           version: adapterVersion,
           runAtCurrTime,
           endTimestamp: new Date(endTimestamp * 1e3).toISOString(),
           recordTimestamp: new Date(recordTimestamp * 1e3).toISOString(),
         })
         return; */
      }


      const promises: any = []
      const rawRecords: RawRecordMap = {}
      const adaptorRecords: {
        [key: string]: AdaptorRecord
      } = {}

      let noDataReturned = true  // flag to track if any data was returned from the adapter, idea is this would be empty if we run for a timestamp before the adapter's start date


      for (const [version, adapter] of adaptersToRun) { // the version is the key for the record (like uni v2) not the version of the adapter
        const chainBlocks = {} // WARNING: reset chain blocks for each adapter, sharing this between v1 & v2 adapters that have different end timestamps have nasty side effects
        const runAdapterRes = await runAdapter(adapter, endTimestamp, chainBlocks, module, version, { adapterVersion })
        if (noDataReturned) noDataReturned = runAdapterRes.length === 0

        const recordWithTimestamp = runAdapterRes.find((r: any) => r.timestamp)
        if (recordWithTimestamp) {
          if (runType === 'store-all') {
            // check if the timestamp is valid by checking if it is in the current year
            const year = new Date(recordWithTimestamp.timestamp * 1e3).getUTCFullYear()
            if (year !== new Date().getUTCFullYear()) {
              console.error(`Record timestamp ${adapterType} - ${module} - ${version} - invalid timestamp`, new Date(recordWithTimestamp.timestamp * 1e3).toISOString(), 'current time: ', new Date().toISOString())
            } else
              recordTimestamp = recordWithTimestamp.timestamp
          } else {
            recordTimestamp = recordWithTimestamp.timestamp
          }
        }
        processFulfilledPromises(runAdapterRes, rawRecords, version, KEYS_TO_STORE)
      }


      if (noDataReturned && isRunFromRefillScript) {
        console.info(`[${new Date(endTimestamp*1000).toISOString().slice(0, 10)}] No data returned for ${adapterType} - ${module} - skipping`)
        return;
      }

      const storedData: any = {}
      const adaptorRecordTypeByValue: any = Object.fromEntries(Object.entries(AdaptorRecordType).map(([key, value]) => [value, key]))
      for (const [recordType, record] of Object.entries(rawRecords)) {
        // console.info("STORING -> ", module, adapterType, recordType as AdaptorRecordType, id, recordTimestamp, record, adaptor.protocolType, protocol.defillamaId, protocol.versionKey)
        storedData[adaptorRecordTypeByValue[recordType]] = record
        adaptorRecords[recordType] = new AdaptorRecord(recordType as AdaptorRecordType, id, recordTimestamp, record, adaptor.protocolType)
        if (!isDryRun) {
          const promise = storeAdaptorRecord(adaptorRecords[recordType], recordTimestamp)
          promises.push(promise)
        }
      }
      const adapterRecord = AdapterRecord2.formAdaptarRecord2({ adaptorRecords, protocolType: adaptor.protocolType, adapterType, protocol, configIdMap })
      if (adapterRecord && !isDryRun)
        await storeAdapterRecord(adapterRecord)
      await Promise.all(promises)
      if (process.env.runLocal === 'true' || isRunFromRefillScript)
        printData(storedData, recordTimestamp, protocol.module)

      if (refillYesterdayPromise) 
        await refillYesterdayPromise
    }
    catch (error) {
      try { (error as any).module = module } catch (e) { }
      success = false
      errorObject = error
    }

    const endTime = getUnixTimeNow()
    await elastic.addRuntimeLog({ runtime: endTime - startTime, success, metadata, })

    if (errorObject) {
      await elastic.addErrorLog({ error: errorObject, metadata })
      throw errorObject
    }
  }
};

type chainObjet = {
  [chain: string]: {
    [key: string]: any
  }
}

function printData(data: any, timestamp?: number, protocolName?: string) {
  const chains: chainObjet = {};
  console.info(`\nrecord timestamp: ${timestamp} (${new Date((timestamp ?? 0) * 1e3).toISOString()})`)

  // Collect data from all chains and keys
  for (const [mainKey, chainData] of Object.entries(data)) {
    for (const [chain, values] of Object.entries(chainData as any)) {
      if (!chains[chain]) {
        chains[chain] = { protocols: {}, versions: {} };
      }
      for (const [subKey, value] of Object.entries(values as any)) {
        if (subKey === protocolName) {
          chains[chain].protocols[mainKey] = value;
        } else {
          if (!chains[chain].versions[subKey]) {
            chains[chain].versions[subKey] = {};
          }
          chains[chain].versions[subKey][mainKey] = value;
        }
      }
    }
  }

  // Print data, prioritizing protocol matches and handling versions otherwise
  for (const [chain, values] of Object.entries(chains)) {
    if (Object.keys(values.protocols).length > 0) {
      console.info('')
      console.log(`chain: ${chain}`);
      for (const [key, value] of Object.entries(values.protocols)) {
        console.log(`${key}: ${humanizeNumber(Number(value))}`);
      }
    } else {
      for (const [version, versionData] of Object.entries(values.versions)) {
        console.info('')
        console.log(`chain: ${chain}`);
        console.log(`version: ${version}`);
        for (const [key, value] of Object.entries(versionData as any)) {
          console.log(`${key}: ${humanizeNumber(Number(value))}`);
        }
      }
    }
  }
  console.info('\n')
}
