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
import { IJSON, ProtocolAdaptor, } from "../../data/types";
import { PromisePool } from '@supercharge/promise-pool'
import { AdapterRecord2, } from "../../db-utils/AdapterRecord2";
import { storeAdapterRecord } from "../../db-utils/db2";


// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

export interface IHandlerEvent {
  protocolModules: string[]
  timestamp?: number
  adaptorType: AdapterType
  chain?: Chain
  adaptorRecordTypes?: string[]
  protocolVersion?: string
}

const LAMBDA_TIMESTAMP = getTimestampAtStartOfHour(Math.trunc((Date.now()) / 1000))

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
}

export const handler2 = async (event: IStoreAdaptorDataHandlerEvent) => {
  const { timestamp, adapterType, protocolNames, maxConcurrency = 13 } = event
  console.info(`- timestamp: ${timestamp}`)
  // Timestamp to query, defaults current timestamp - 2 minutes delay
  const isTimestampProvided = timestamp !== undefined
  const currentTimestamp = timestamp ?? LAMBDA_TIMESTAMP;
  // Get clean day
  const toTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp)
  const fromTimestamp = getTimestampAtStartOfDayUTC(toTimestamp - 1)

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
  protocols = protocols.filter(p => !protocolNames || protocolNames.has(p.displayName))
  // randomize the order of execution
  protocols = protocols.sort(() => Math.random() - 0.5)
  if (protocolNames) console.log('refilling for', protocols.map(a => a.module), protocols.length)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = protocols.reduce((acc, { chains }) => {
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
  console.info(`- count: ${protocols.length}`)

  const { errors, results } = await PromisePool
    .withConcurrency(maxConcurrency)
    .for(protocols)
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
  console.info(`adapterType: ${adapterType}`)
  console.info(`Success: ${results.length}`)
  console.info(`Errors: ${errors.length}`)
  if (errorObjects.length) console.table(errorObjects)
  // console.log(JSON.stringify(errorObjects, null, 2))

  console.info(`**************************`)

  async function runAndStoreProtocol(protocol: ProtocolAdaptor, index: number) {
    console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module}`)
    // Get adapter info
    let { id, module, versionKey } = protocol;
    // console.info(`Adapter found ${id} ${module} ${versionKey}`)

    try {
      // Import adaptor
      const adaptor: Adapter = importModule(module).default;
      // if an adaptor is expensive and no timestamp is provided, we try to avoid running every hour, but only from 21:55 to 01:55
      if (adaptor.isExpensiveAdapter && !isTimestampProvided) {
        const date = new Date(currentTimestamp * 1000)
        const hours = date.getUTCHours()
        if (hours > 2) {
          console.info(`[${adapterType}] - ${index + 1}/${protocols.length} - ${protocol.module} - skipping because it's an expensive adapter and it's not the right time`)
          return
        }
      }
      const adapterVersion = adaptor.version
      const isVersion2 = adapterVersion === 2
      const endTimestamp = (isVersion2 && !timestamp) ? LAMBDA_TIMESTAMP : toTimestamp // if version 2 and no timestamp, use current time as input for running the adapter
      const recordTimestamp = isVersion2 ? toTimestamp : fromTimestamp // if version 2, store the record at with timestamp end of range, else store at start of range

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
        if (runAtCurrTime && Math.abs(LAMBDA_TIMESTAMP - endTimestamp) > 60 * 60 * 3)
          throw new Error('This Adapter can be run only around current time') // allow run current time if within 3 hours
        const runAdapterRes = await runAdapter(adapter, endTimestamp, chainBlocks, module, version, { adapterVersion })
        processFulfilledPromises(runAdapterRes, rawRecords, version, KEYS_TO_STORE)
      }

      for (const [recordType, record] of Object.entries(rawRecords)) {
        // console.info("STORING -> ", module, adaptorType, recordType as AdaptorRecordType, id, fromTimestamp, record, adaptor.protocolType, protocol.defillamaId, protocol.versionKey)
        adaptorRecords[recordType] = new AdaptorRecord(recordType as AdaptorRecordType, id, recordTimestamp, record, adaptor.protocolType)
        const promise = storeAdaptorRecord(adaptorRecords[recordType], LAMBDA_TIMESTAMP)
        promises.push(promise)
      }
      const adapterRecord = AdapterRecord2.formAdaptarRecord2({ adaptorRecords, protocolType: adaptor.protocolType, adapterType, protocol, configIdMap })
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
