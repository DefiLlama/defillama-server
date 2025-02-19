import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC, getTimestampAtStartOfHour } from "../../../utils/date";
import { ChainBlocks, Adapter, AdapterType, BaseAdapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import canGetBlock from "../../utils/canGetBlock";
import runAdapter from "@defillama/dimension-adapters/adapters/utils/runAdapter";
import { getBlock } from "@defillama/dimension-adapters/helpers/getBlock";
import { Chain } from "@defillama/sdk/build/general";
import { AdaptorRecord, AdaptorRecordType, RawRecordMap, storeAdaptorRecord } from "../../db-utils/adaptor-record";
import { processFulfilledPromises, } from "./helpers";
import loadAdaptorsData from "../../data"
import { ProtocolAdaptor, } from "../../data/types";
import { PromisePool } from '@supercharge/promise-pool'
import { AdapterRecord2, } from "../../db-utils/AdapterRecord2";
import { storeAdapterRecord } from "../../db-utils/db2";
import { elastic } from '@defillama/sdk';
import { getUnixTimeNow } from "../../../api2/utils/time";
import { humanizeNumber, } from "@defillama/sdk/build/computeTVL/humanizeNumber";
import { sendDiscordAlert } from "../../utils/notify";


// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

export interface IHandlerEvent {
  protocolModules: string[]
  timestamp?: number
  adaptorType: AdapterType
  chain?: Chain
  adaptorRecordTypes?: string[]
  protocolVersion?: string
}

const timeStartofTheHourToday = getTimestampAtStartOfHour(Math.trunc((Date.now()) / 1000))

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
  runType?: 'store-all' | 'default'
}

const ONE_DAY_IN_SECONDS = 24 * 60 * 60

export const handler2 = async (event: IStoreAdaptorDataHandlerEvent) => {
  const defaultMaxConcurrency = 21
  let { timestamp, adapterType, protocolNames, maxConcurrency = defaultMaxConcurrency, isDryRun = false, isRunFromRefillScript = false,
    runType = 'default', yesterdayIdSet = new Set()

  } = event
  if (!isRunFromRefillScript)
    console.info(`- Date: ${new Date(timestamp! * 1e3).toDateString()} (timestamp ${timestamp})`)
  // Timestamp to query, defaults current timestamp - 2 minutes delay
  const currentTimestamp = timestamp ?? timeStartofTheHourToday;
  // Get clean day
  let toTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp)
  let fromTimestamp = getTimestampAtStartOfDayUTC(toTimestamp - 1)

  // I didnt want to touch existing implementation that affects other scripts, but it looks like it is off by a day if we store it at the end of the time range (which is next day 00:00 UTC)
  if (isRunFromRefillScript) {
    fromTimestamp = getTimestampAtStartOfDayUTC(timestamp!)
    toTimestamp = fromTimestamp + ONE_DAY_IN_SECONDS - 1
  } else if (runType === 'store-all') {
    fromTimestamp = getTimestampAtStartOfDayUTC(timeStartofTheHourToday - ONE_DAY_IN_SECONDS)
    toTimestamp = fromTimestamp + ONE_DAY_IN_SECONDS - 1
  }

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
  // console.log(JSON.stringify(errorObjects, null, 2))

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
    let errorObject: any
    // Get adapter info
    let { id, module, } = protocol;
    // console.info(`Adapter found ${id} ${module} ${versionKey}`)

    try {
      // Import adaptor
      const adaptor: Adapter = (await importModule(module)).default;
      // if an adaptor is expensive and no timestamp is provided, we try to avoid running every hour, but only from 21:55 to 01:55
      const adapterVersion = adaptor.version
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


      if (runType === 'store-all') {
        let runAtCurrTime = adaptersToRun.some(([_version, adapter]) => Object.values(adapter).some(a => a.runAtCurrTime))

        const date = new Date()
        const hours = date.getUTCHours()

        if (runAtCurrTime) {
          recordTimestamp = timeStartofTheHourToday
          endTimestamp = timeStartofTheHourToday

          if (hours < 19) {
            console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module} - skipping because it's not the right time (too early to fetch today's data)`)
            return
          }
        } else if (yesterdayIdSet.has(id)) {
          console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module} - skipping because it's already stored`)
          return
        } else if (hours < 2) {
          console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module} - skipping because it's not the right time (too early to fetch yesterday's data, wait for indexer to catch up)`)
          return
        }
      }

      const promises: any = []
      const rawRecords: RawRecordMap = {}
      const adaptorRecords: {
        [key: string]: AdaptorRecord
      } = {}
      for (const [version, adapter] of adaptersToRun) { // the version is the key for the record (like uni v2) not the version of the adapter
        const chainBlocks = {} // WARNING: reset chain blocks for each adapter, sharing this between v1 & v2 adapters that have different end timestamps have nasty side effects
        const runAdapterRes = await runAdapter(adapter, endTimestamp, chainBlocks, module, version, { adapterVersion })

        const recordWithTimestamp = runAdapterRes.find((r: any) => r.timestamp)
        if (recordWithTimestamp) recordTimestamp = recordWithTimestamp.timestamp
        processFulfilledPromises(runAdapterRes, rawRecords, version, KEYS_TO_STORE)
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

