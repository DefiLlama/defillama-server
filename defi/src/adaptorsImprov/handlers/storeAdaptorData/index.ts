import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { ChainBlocks, Adapter, AdapterType, BaseAdapter } from "@defillama/dimension-adapters/adapters/types";
import canGetBlock from "../../utils/canGetBlock";
import allSettled from 'promise.allsettled'
import runAdapter, { getFulfilledResults, getRejectedResults } from "@defillama/dimension-adapters/adapters/utils/runAdapter";
import { getBlock } from "@defillama/dimension-adapters/helpers/getBlock";
import { Chain } from "@defillama/sdk/build/general";
import { AdaptorRecord, AdaptorRecordType, AdaptorRecordTypeMap, AdaptorRecordTypeMapReverse, RawRecordMap, storeAdaptorRecord } from "../../db-utils/adaptor-record";
import { processFulfilledPromises, processRejectedPromises, STORE_ERROR } from "./helpers";
import loadAdaptorsData from "../../data"
import { IJSON } from "../../data/types";

// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

export interface IHandlerEvent {
  protocolIndexes: number[]
  timestamp?: number
  adaptorType: AdapterType
  chain?: Chain
  adaptorRecordTypes?: string[]
  protocolVersion?: string
}

const LAMBDA_TIMESTAMP = Math.trunc((Date.now()) / 1000)

export const handler = async (event: IHandlerEvent) => {
  console.info(`*************Storing for the following indexs ${event.protocolIndexes} *************`)
  console.info(`- chain: ${event.chain}`)
  console.info(`- timestamp: ${event.timestamp}`)
  console.info(`- adaptorRecordTypes: ${event.adaptorRecordTypes}`)
  console.info(`- protocolVersion: ${event.protocolVersion}`)
  // Timestamp to query, defaults current timestamp - 2 minutes delay
  const currentTimestamp = event.timestamp || LAMBDA_TIMESTAMP;
  // Get clean day
  const cleanCurrentDayTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp)
  const cleanPreviousDayTimestamp = getTimestampAtStartOfDayUTC(cleanCurrentDayTimestamp - 1)

  // Import data list to be used
  const dataModule = loadAdaptorsData(event.adaptorType)
  const dataList = dataModule.default
  // Import some utils
  const { importModule, KEYS_TO_STORE } = dataModule

  // Get list of adaptors to run
  const adaptorsList = event.protocolIndexes.map(index => dataList[index]).filter(p => p !== undefined)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = event.chain ? [event.chain] : adaptorsList.reduce((acc, { chains }) => {
    acc.push(...chains as Chain[])
    return acc
  }, [] as Chain[]).filter(canGetBlock)
  const chainBlocks: ChainBlocks = {};
  await allSettled(
    allChains.map(async (chain) => {
      try {
        const latestBlock = await getBlock(cleanCurrentDayTimestamp, chain, chainBlocks).catch((e: any) => console.error(`${e.message}; ${cleanCurrentDayTimestamp}, ${chain}`))
        if (latestBlock)
          chainBlocks[chain] = latestBlock
      } catch (e) { console.log(e) }
    })
  );

  const results = await allSettled(event.protocolIndexes.map(async protocolIndex => {
    // Get adapter info
    const { id, module } = dataList[protocolIndex];
    console.info(`Adapter found ${protocolIndex} ${id} ${module}`)

    try {
      // Import adaptor
      const adaptor: Adapter = importModule(module).default;
      console.info("Improted OK")

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
      const FILTRED_KEYS_TO_STORE = event.adaptorRecordTypes?.reduce((acc, curr) => {
        acc[AdaptorRecordTypeMap[curr]] = curr
        return acc
      }, {} as IJSON<string>) ?? AdaptorRecordTypeMapReverse
      const rawRecords: RawRecordMap = {}
      for (const [version, adapter] of adaptersToRun) {
        const runAtCurrTime = Object.values(adapter).some(a => a.runAtCurrTime)
        if (runAtCurrTime && Math.abs(LAMBDA_TIMESTAMP - cleanCurrentDayTimestamp) > 60 * 60 * 2) continue
        const runAdapterRes = await runAdapter(adapter, cleanCurrentDayTimestamp, chainBlocks, module)
        const fulfilledResults = getFulfilledResults(runAdapterRes)
        processFulfilledPromises(fulfilledResults, rawRecords, version, FILTRED_KEYS_TO_STORE)
        const rejectedResults = getRejectedResults(runAdapterRes)
        // Make sure rejected ones are also included in rawRecords
        processRejectedPromises(rejectedResults, rawRecords, module, FILTRED_KEYS_TO_STORE)
      }

      // Store records // TODO: Change to run in parallel
      for (const [recordType, record] of Object.entries(rawRecords)) {
        console.log(event.adaptorType, recordType as AdaptorRecordType, id, cleanPreviousDayTimestamp, record, adaptor.protocolType)
        await storeAdaptorRecord(new AdaptorRecord(recordType as AdaptorRecordType, id, cleanPreviousDayTimestamp, record, adaptor.protocolType), LAMBDA_TIMESTAMP)
      }
    }
    catch (error) {
      const err = error as Error
      console.error(`${STORE_ERROR}:${module}: ${err.message}`)
      console.error(error)
      throw error
    }
  }))
  console.info("Execution result", results)
  console.info(`**************************`)
};

export default wrapScheduledLambda(handler);