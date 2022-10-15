import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import { ChainBlocks, Adapter, AdapterType, BaseAdapter } from "@defillama/adaptors/adapters/types";
import canGetBlock from "../../utils/canGetBlock";
import allSettled from 'promise.allsettled'
import runAdapter, { getFulfilledResults, getRejectedResults } from "@defillama/adaptors/adapters/utils/runAdapter";
import { getBlock } from "@defillama/adaptors/helpers/getBlock";
import { ProtocolAdaptor } from "../../data/types";
import { Chain } from "@defillama/sdk/build/general";
import { AdaptorRecord, AdaptorRecordType, RawRecordMap, storeAdaptorRecord } from "../../db-utils/adaptor-record";
import { processFulfilledPromises, processRejectedPromises, STORE_ERROR } from "./helpers";
import loadAdaptorsData from "../../data"

// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

export interface IHandlerEvent {
  protocolIndexes: number[]
  timestamp?: number
  adaptorType: AdapterType
}

const LAMBDA_TIMESTAMP = Math.trunc((Date.now()) / 1000)

export const handler = async (event: IHandlerEvent) => {
  console.info(`*************Storing for the following indexs ${event.protocolIndexes} *************`)
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
  const adaptorsList = event.protocolIndexes.map(index => dataList[index])

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = adaptorsList.reduce((acc, { chains }) => {
    acc.push(...chains as Chain[])
    return acc
  }, [] as Chain[]).filter(canGetBlock)
  const chainBlocks: ChainBlocks = {};
  await allSettled(
    allChains.map(async (chain) => {
      try {
        console.log(cleanCurrentDayTimestamp, chain, chainBlocks)
        const latestBlock = await getBlock(cleanCurrentDayTimestamp*1000, chain, chainBlocks).catch((e: any) => console.error(`${e.message}; ${cleanCurrentDayTimestamp}, ${chain}`))
        if (latestBlock)
          chainBlocks[chain] = latestBlock
      } catch (e) { console.log(e) }
    })
  );

  console.log("chainss", chainBlocks)

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
        const breakdownAdapters = Object.entries(dexBreakDownAdapter)
        for (const [version, adapter] of breakdownAdapters) {
          adaptersToRun.push([version, adapter])
        }
      } else {
        throw new Error("Invalid adapter")
      }

      // Run adapters // TODO: Change to run in parallel
      const rawRecords: RawRecordMap = {}
      for (const [version, adapter] of adaptersToRun) {
        const runAdapterRes = await runAdapter(adapter, cleanCurrentDayTimestamp, chainBlocks)
        const fulfilledResults = getFulfilledResults(runAdapterRes)
        processFulfilledPromises(fulfilledResults, rawRecords, version, KEYS_TO_STORE)
        const rejectedResults = getRejectedResults(runAdapterRes)
        // Make sure rejected ones are also included in rawRecords
        processRejectedPromises(rejectedResults, rawRecords, module, KEYS_TO_STORE)
      }

      // Store records // TODO: Change to run in parallel
      for (const [recordType, record] of Object.entries(rawRecords)) {
        await storeAdaptorRecord(new AdaptorRecord(recordType as AdaptorRecordType, id, cleanPreviousDayTimestamp, record), LAMBDA_TIMESTAMP)
      }
    }
    catch (error) {
      const err = error as Error
      console.error(`${STORE_ERROR}:${module}: ${err.message}`)
      console.error(error)
      throw error
    }
  }))
  console.info("Execution result", JSON.stringify(results))
  console.info(`**************************`)
};

export default wrapScheduledLambda(handler);