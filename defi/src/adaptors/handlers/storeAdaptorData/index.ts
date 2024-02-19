import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { ChainBlocks, Adapter, AdapterType, BaseAdapter, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import canGetBlock from "../../utils/canGetBlock";
import runAdapter from "@defillama/dimension-adapters/adapters/utils/runAdapter";
import { getBlock } from "@defillama/dimension-adapters/helpers/getBlock";
import { Chain } from "@defillama/sdk/build/general";
import { AdaptorRecord, AdaptorRecordType, RawRecordMap, storeAdaptorRecord } from "../../db-utils/adaptor-record";
import { processFulfilledPromises, } from "./helpers";
import loadAdaptorsData from "../../data"
import { IJSON, ProtocolAdaptor, } from "../../data/types";
import { PromisePool } from '@supercharge/promise-pool'
import { AdapterRecord, storeAdapterRecord } from "../../db-utils/AdapterRecord";


// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

export interface IHandlerEvent {
  protocolModules: string[]
  timestamp?: number
  adaptorType: AdapterType
  chain?: Chain
  adaptorRecordTypes?: string[]
  protocolVersion?: string
}

const LAMBDA_TIMESTAMP = Math.trunc((Date.now()) / 1000)

export const handler = async (event: IHandlerEvent) => {
  console.info(`*************Storing for the following indexs ${event.protocolModules} *************`)
  console.info(`- chain: ${event.chain}`)
  console.info(`- timestamp: ${event.timestamp}`)
  console.info(`- adaptorRecordTypes: ${event.adaptorRecordTypes}`)
  console.info(`- protocolVersion: ${event.protocolVersion}`)

  delete event.chain
  delete event.protocolVersion
  // Timestamp to query, defaults current timestamp - 2 minutes delay
  const currentTimestamp = event.timestamp || LAMBDA_TIMESTAMP;
  // Get clean day
  const cleanCurrentDayTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp)
  const cleanPreviousDayTimestamp = getTimestampAtStartOfDayUTC(cleanCurrentDayTimestamp - 1)

  // Import data list to be used
  const dataModule = await loadAdaptorsData(event.adaptorType)
  const dataList = dataModule.default
  const dataMap = dataList.reduce((acc, curr) => {
    acc[curr.module] = curr
    return acc
  }, {} as IJSON<typeof dataList[number]>)
  // Import some utils
  const { importModule, KEYS_TO_STORE, config } = dataModule

  // Get list of adaptors to run
  const adaptorsList = event.protocolModules.map(index => dataMap[index]).filter(p => p !== undefined)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = event.chain ? [event.chain] : adaptorsList.reduce((acc, { chains }) => {
    acc.push(...chains as Chain[])
    return acc
  }, [] as Chain[]).filter(canGetBlock)
  const chainBlocks: ChainBlocks = {};
  await Promise.all(allChains.map(async (chain) => {
    try {
      const latestBlock = await getBlock(cleanCurrentDayTimestamp, chain, chainBlocks).catch((e: any) => console.error(`${e.message}; ${cleanCurrentDayTimestamp}, ${chain}`))
      if (latestBlock)
        chainBlocks[chain] = latestBlock
    } catch (e) { console.log(e) }
  }));

  const { errors, results } = await PromisePool
    .withConcurrency(32)
    .for(adaptorsList)
    .process(runAndStoreProtocol)

  console.info(`Success: ${results.length}`)
  console.info(`Errors: ${errors.length}`)
  console.info(`**************************`)

  async function runAndStoreProtocol(protocol: ProtocolAdaptor) {
    // Get adapter info
    let { id, module, versionKey } = protocol;
    console.info(`Adapter found ${id} ${module} ${versionKey}`)

    try {
      // Import adaptor
      const adaptor: Adapter = importModule(module).default;
      console.info("Imported OK")

      // Get list of adapters to run
      const adaptersToRun: [string, BaseAdapter][] = []
      if ("adapter" in adaptor) {
        adaptersToRun.push([module, adaptor.adapter])
      } else if ("breakdown" in adaptor) {
        const dexBreakDownAdapter = adaptor.breakdown
        const breakdownAdapters = Object.entries(dexBreakDownAdapter).filter(([version]) => !event.protocolVersion || version === event.protocolVersion)
        for (const [version, adapter] of breakdownAdapters) {
          adaptersToRun.push([
            version,
            Object.keys(adapter).reduce((acc, chain) => {
              if (event.chain && event.chain !== chain) delete acc[chain]
              return acc
            }, adapter)
          ])
        }
      } else {
        throw new Error("Invalid adapter")
      }

      // Run adapters // TODO: Change to run in parallel
      const FILTRED_KEYS_TO_STORE = KEYS_TO_STORE/* event.adaptorRecordTypes?.reduce((acc, curr) => {
        acc[AdaptorRecordTypeMap[curr]] = curr
        return acc
      }, {} as IJSON<string>) ?? AdaptorRecordTypeMapReverse */
      const promises = []
      if (adaptor.protocolType === ProtocolType.COLLECTION) {
        for (const [version, adapter] of adaptersToRun) {
          const colletionConfig = config[module]?.protocolsData?.[version]
          if (!colletionConfig) continue
          id = colletionConfig.id
          const rawRecords: RawRecordMap = {}
          const runAtCurrTime = Object.values(adapter).some(a => a.runAtCurrTime)
          if (runAtCurrTime && Math.abs(LAMBDA_TIMESTAMP - cleanCurrentDayTimestamp) > 60 * 60 * 2) continue
          const runAdapterRes = await runAdapter(adapter, cleanCurrentDayTimestamp, chainBlocks, module, version)
          processFulfilledPromises(runAdapterRes, rawRecords, version, FILTRED_KEYS_TO_STORE)
          for (const [recordType, record] of Object.entries(rawRecords)) {
            console.info("STORING -> ", module, event.adaptorType, recordType as AdaptorRecordType, id, cleanPreviousDayTimestamp, record, adaptor.protocolType)
            const promise = storeAdaptorRecord(new AdaptorRecord(recordType as AdaptorRecordType, id, cleanPreviousDayTimestamp, record, adaptor.protocolType), LAMBDA_TIMESTAMP)
            promises.push(promise)
          }
        }
      } else {
        const rawRecords: RawRecordMap = {}
        for (const [version, adapter] of adaptersToRun) {
          const runAtCurrTime = Object.values(adapter).some(a => a.runAtCurrTime)
          if (runAtCurrTime && Math.abs(LAMBDA_TIMESTAMP - cleanCurrentDayTimestamp) > 60 * 60 * 2) continue
          const runAdapterRes = await runAdapter(adapter, cleanCurrentDayTimestamp, chainBlocks, module, version)
          processFulfilledPromises(runAdapterRes, rawRecords, version, FILTRED_KEYS_TO_STORE)
        }

        // Store records // TODO: Change to run in parallel
        for (const [recordType, record] of Object.entries(rawRecords)) {
          console.log("STORING -> ", module, event.adaptorType, recordType as AdaptorRecordType, id, cleanPreviousDayTimestamp, record, adaptor.protocolType)
          const promise = storeAdaptorRecord(new AdaptorRecord(recordType as AdaptorRecordType, id, cleanPreviousDayTimestamp, record, adaptor.protocolType), LAMBDA_TIMESTAMP)
          promises.push(promise)
        }
      }
      await Promise.all(promises)
    }
    catch (error) {
      try { (error as any).module = module } catch (e) { }
      throw error
    }
  }
};

export default wrapScheduledLambda(handler);

export type IStoreAdaptorDataHandlerEvent = {
  timestamp?: number
  adaptorType: AdapterType
  adaptorNames?: Set<string>
  maxConcurrency?: number
}

export const handler2 = async (event: IStoreAdaptorDataHandlerEvent) => {
  const { timestamp, adaptorType, adaptorNames, maxConcurrency = 13 } = event
  console.info(`- timestamp: ${timestamp}`)
  // Timestamp to query, defaults current timestamp - 2 minutes delay
  const currentTimestamp = timestamp ?? LAMBDA_TIMESTAMP;
  // Get clean day
  const toTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp)
  const fromTimestamp = getTimestampAtStartOfDayUTC(toTimestamp - 1)

  // Import data list to be used
  const dataModule = await loadAdaptorsData(adaptorType)
  const dataList = dataModule.default
  const dataMap = dataList.reduce((acc, curr) => {
    acc[curr.module] = curr
    return acc
  }, {} as IJSON<typeof dataList[number]>)
  // Import some utils
  const { importModule, KEYS_TO_STORE, config } = dataModule
  const configIdMap: any = {}
  Object.entries(config).forEach(([key, i]) => {
  const id = config[key].isChain ? 'chain#' + i.id : i.id
    configIdMap[id] = i
  })

  // Get list of adaptors to run
  const allAdaptors = Object.values(dataMap).filter(p => p)
  const adaptorsList = allAdaptors
    .filter(p => !adaptorNames || adaptorNames.has(p.displayName))
  if (adaptorNames) console.log('refilling for', adaptorsList.map(a => a.module), adaptorsList.length)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = adaptorsList.reduce((acc, { chains }) => {
    acc.push(...chains as Chain[])
    return acc
  }, [] as Chain[]).filter(canGetBlock)
  const chainBlocks: ChainBlocks = {};
  await Promise.all(
    allChains.map(async (chain) => {
      try {
        const latestBlock = await getBlock(toTimestamp, chain, chainBlocks).catch((e: any) => console.error(`${e.message}; ${toTimestamp}, ${chain}`))
        if (latestBlock)
          chainBlocks[chain] = latestBlock
      } catch (e) { console.log(e) }
    })
  );

  // console.info(`*************Storing for the following indexs ${adaptorsList.map(a => a.module)} *************`)
  console.info(`- count: ${adaptorsList.length}`)

  const { errors, results } = await PromisePool
    .withConcurrency(maxConcurrency)
    .for(adaptorsList)
    .process(runAndStoreProtocol)

  const shortenString = (str: string, length: number = 250) => str.length > length ? str.slice(0, length) + '...' : str

  const errorObjects = errors.map(({ raw, item, message }: any) => {
    return {
      adapter: `${item.name} - ${item.versionKey ?? ''}`,
      message: shortenString(message),
      chain: raw.chain,
      // stack: raw.stack?.split('\n').slice(1, 2).join('\n')
    }
  })
  console.info(`adaptorType: ${adaptorType}`)
  console.info(`Success: ${results.length}`)
  console.info(`Errors: ${errors.length}`)
  if (errorObjects.length) console.table(errorObjects)
  // console.log(JSON.stringify(errorObjects, null, 2))

  console.info(`**************************`)

  async function runAndStoreProtocol(protocol: ProtocolAdaptor, index: number) {
    console.info(`[${adaptorType}] - ${index + 1}/${adaptorsList.length} - ${protocol.module}`)
    // Get adapter info
    let { id, module, versionKey } = protocol;
    // console.info(`Adapter found ${id} ${module} ${versionKey}`)

    try {
      // Import adaptor
      const adaptor: Adapter = importModule(module).default;

      // Get list of adapters to run
      const adaptersToRun: [string, BaseAdapter][] = []
      if ("adapter" in adaptor) {
        adaptersToRun.push([module, adaptor.adapter])
      } else if ("breakdown" in adaptor) {
        const dexBreakDownAdapter = adaptor.breakdown
        const breakdownAdapters = Object.entries(dexBreakDownAdapter)
        for (const [version, adapter] of breakdownAdapters) {
          adaptersToRun.push([version, adapter])
        }
      } else
        throw new Error("Invalid adapter")

      const promises: any = []
      const rawRecords: RawRecordMap = {}
      const adaptorRecords: {
        [key: string]: AdaptorRecord
      } = {}
      for (const [version, adapter] of adaptersToRun) {
        const runAtCurrTime = Object.values(adapter).some(a => a.runAtCurrTime)
        if (runAtCurrTime && Math.abs(LAMBDA_TIMESTAMP - toTimestamp) > 60 * 60 * 3) continue // allow run current time if within 3 hours
        const runAdapterRes = await runAdapter(adapter, toTimestamp, chainBlocks, module, version)
        processFulfilledPromises(runAdapterRes, rawRecords, version, KEYS_TO_STORE)
      }

      for (const [recordType, record] of Object.entries(rawRecords)) {
        // console.info("STORING -> ", module, adaptorType, recordType as AdaptorRecordType, id, fromTimestamp, record, adaptor.protocolType, protocol.defillamaId, protocol.versionKey)
        adaptorRecords[recordType] = new AdaptorRecord(recordType as AdaptorRecordType, id, fromTimestamp, record, adaptor.protocolType)
        const promise = storeAdaptorRecord(adaptorRecords[recordType], LAMBDA_TIMESTAMP)
        promises.push(promise)
      }
      const adapterRecord = AdapterRecord.formAdaptorRecord2({ adaptorRecords, protocolType: adaptor.protocolType, adapterType: adaptorType, protocol, configIdMap })
      if (adapterRecord)
        await storeAdapterRecord(adapterRecord)
      await Promise.all(promises)
    }
    catch (error) {
      try { (error as any).module = module } catch (e) { }
      throw error
    }
  }
};
