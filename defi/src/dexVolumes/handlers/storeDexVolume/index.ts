import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import volumeAdapters from "../../dexAdapters";
import { ChainBlocks, VolumeAdapter, Adapter, DISABLED_ADAPTER_KEY } from "@defillama/adapters/volumes/dexVolume.type";
import { storeVolume, Volume, VolumeType, getVolume } from "../../data/volume";
import getChainsFromDexAdapters from "../../utils/getChainsFromDexAdapters";
import canGetBlock from "../../utils/canGetBlock";
import allSettled from 'promise.allsettled'
import { importVolumeAdapter } from "../../../utils/imports/importDexAdapters";
import runAdapter from "./runAdapter";
const { getBlock } = require("@defillama/adapters/projects/helper/getBlock")

// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

export interface IHandlerEvent {
  protocolIndexes: number[]
  timestamp?: number
}

export interface IRecordVolumeData {
  [chain: string]: {
    [protocolVersion: string]: number | string,
  }
}

export const STORE_DEX_VOLUME_ERROR = "STORE_DEX_VOLUME_ERROR"
const LAMBDA_TIMESTAMP = Math.trunc((Date.now()) / 1000)

export const handler = async (event: IHandlerEvent) => {
  console.info(`**************************************Storing volumes for the following indexs ${event.protocolIndexes}**************************************`)
  // Timestamp to query, defaults current timestamp - 2 minutes delay
  const currentTimestamp = event.timestamp || LAMBDA_TIMESTAMP;
  // Get clean day
  const cleanCurrentDayTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp)
  const cleanPreviousDayTimestamp = getTimestampAtStartOfDayUTC(cleanCurrentDayTimestamp - 1)

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = getChainsFromDexAdapters(
    event.protocolIndexes.map(index => volumeAdapters[index].volumeAdapter)
  ).filter(canGetBlock)

  const chainBlocks: ChainBlocks = {};
  await allSettled(
    allChains.map(async (chain) => {
      try {
        const latestBlock = await getBlock(cleanCurrentDayTimestamp, chain, chainBlocks).catch((e: any) => console.error(`${e.message}; ${cleanCurrentDayTimestamp}, ${chain}`))
        chainBlocks[chain] = latestBlock
      } catch (e) { console.log(e) }
    })
  );

  const results = await allSettled(event.protocolIndexes.map(async protocolIndex => {
    // Get DEX info
    const { id, volumeAdapter } = volumeAdapters[protocolIndex];
    console.info(`Adapter found ${protocolIndex} ${id} ${volumeAdapter}`)

    try {
      // Import DEX adapter
      const dexAdapter: VolumeAdapter = (await importVolumeAdapter(volumeAdapters[protocolIndex])).default;
      console.info("Improted OK")
      // Retrieve daily volumes
      let rawDailyVolumes: IRecordVolumeData[] = []
      let rawTotalVolumes: IRecordVolumeData[] = []
      if ("volume" in dexAdapter) {
        const runAdapterRes = await runAdapter(dexAdapter.volume, cleanCurrentDayTimestamp, chainBlocks)
        const volumes = runAdapterRes.filter(rar => rar.status === 'fulfilled').map(r => r.status === "fulfilled" && r.value)
        for (const volume of volumes) {
          if (volume && volume.dailyVolume)
            rawDailyVolumes.push({
              [volume.chain]: {
                [volumeAdapter]: +volume.dailyVolume
              },
            })
          if (volume && volume.totalVolume)
            rawTotalVolumes.push({
              [volume.chain]: {
                [volumeAdapter]: +volume.totalVolume
              },
            })
        }
        const volumesRejected: IAllSettledRejection[] = runAdapterRes.filter(rar => rar.status === 'rejected').map(r => r.status === "rejected" && r.reason) as IAllSettledRejection[]
        processRejectedPromises(volumesRejected, rawDailyVolumes, volumeAdapter)
        processRejectedPromises(volumesRejected, rawTotalVolumes, volumeAdapter)
      } else if ("breakdown" in dexAdapter) {
        const dexBreakDownAdapter = dexAdapter.breakdown
        const volumeAdapters = Object.entries(dexBreakDownAdapter)
        for (const [version, volumeAdapterObj] of volumeAdapters) {
          const runAdapterRes = await runAdapter(volumeAdapterObj, cleanCurrentDayTimestamp, chainBlocks)
          const volumes = runAdapterRes.filter(rar => rar.status === 'fulfilled').map(r => r.status === "fulfilled" && r.value)
          for (const volume of volumes) {
            if (volume && volume.dailyVolume)
              rawDailyVolumes.push({
                [volume.chain]: {
                  [version]: +volume.dailyVolume
                },
              })
            if (volume && volume.totalVolume)
              rawTotalVolumes.push({
                [volume.chain]: {
                  [version]: +volume.totalVolume
                },
              })
          }
          const volumesRejected: IAllSettledRejection[] = runAdapterRes.filter(rar => rar.status === 'rejected').map(r => r.status === "rejected" && r.reason) as IAllSettledRejection[]
          processRejectedPromises(volumesRejected, rawDailyVolumes, volumeAdapter)
          processRejectedPromises(volumesRejected, rawTotalVolumes, volumeAdapter)
        }
      } else {
        console.error("Invalid adapter")
        throw new Error("Invalid adapter")
      }
      const dailyVolumes = rawDailyVolumes.reduce((acc, current: IRecordVolumeData) => {
        const chain = Object.keys(current)[0]
        acc[chain] = {
          ...acc[chain],
          ...current[chain]
        }
        return acc
      }, {} as IRecordVolumeData)
      const totalVolumes = rawTotalVolumes.reduce((acc, current: IRecordVolumeData) => {
        const chain = Object.keys(current)[0]
        acc[chain] = {
          ...acc[chain],
          ...current[chain],
        }
        return acc
      }, {} as IRecordVolumeData)

      // TODO: IMPROVE ERROR HANDLING
      try {
        if (Object.entries(totalVolumes).length > 0) {
          console.log("Daily volumes", dailyVolumes, id, cleanPreviousDayTimestamp)
          await storeVolume(new Volume(VolumeType.totalVolume, id, cleanPreviousDayTimestamp, totalVolumes), LAMBDA_TIMESTAMP)
        }
        else console.info("Total volume not found")
      } catch (e) {
        const err = e as Error
        console.error(`${STORE_DEX_VOLUME_ERROR}totalVolume:${volumeAdapter}: ${err.message}`)
      }
      try {
        if (Object.entries(dailyVolumes).length > 0) {
          console.log("Total volumes", totalVolumes, id, cleanPreviousDayTimestamp)
          await storeVolume(new Volume(VolumeType.dailyVolume, id, cleanPreviousDayTimestamp, dailyVolumes), LAMBDA_TIMESTAMP)
        }
        else console.info("Daily volume not found")
      } catch (e) {
        const err = e as Error
        console.error(`${STORE_DEX_VOLUME_ERROR}dailyVolume:${volumeAdapter}: ${err.message}`)
      }
    }
    catch (error) {
      const err = error as Error
      console.error(`${STORE_DEX_VOLUME_ERROR}:${volumeAdapter}: ${err.message}`)
      console.error(error)
      throw error
    }
  }))

  console.info("Execution result", JSON.stringify(results))
  return
};

interface IAllSettledRejection {
  id: string
  timestamp: number
  chain: string
  error: Error
}
function processRejectedPromises(volumesRejected: IAllSettledRejection[], rawDailyVolumes: IRecordVolumeData[], dexName: string) {
  for (const rejVolumes of volumesRejected) {
    console.error(`${STORE_DEX_VOLUME_ERROR}:${dexName}:Rejected volume: ${JSON.stringify(rejVolumes)}\n ID: ${rejVolumes.id}\n TIMESTAMP: ${rejVolumes.timestamp}`)
    if (rejVolumes)
      rawDailyVolumes.push({
        [rejVolumes.chain]: {
          error: rejVolumes.error.message
        },
        // @ts-ignore //TODO: fix
        eventTimestamp: LAMBDA_TIMESTAMP
      })
  }
}

export default wrapScheduledLambda(handler);