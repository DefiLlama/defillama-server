import { getChainBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import volumeAdapters from "../../dexAdapters";
import { DexAdapter, VolumeAdapter } from "@defillama/adapters/dexVolumes/dexVolume.type";
import { storeVolume, Volume, VolumeType } from "../../data/volume";
import getAllChainsFromDexAdapters from "../../utils/getAllChainsFromDexAdapters";
import canGetBlock from "../../utils/canGetBlock";
import allSettled from 'promise.allsettled'
import { importVolumeAdapter } from "../../../utils/imports/importDexAdapters";

// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

interface IHandlerEvent {
  protocolIndexes: number[]
  timestamp?: number
}

export interface IRecordVolumeData {
  [chain: string]: {
    [protocolVersion: string]: number | string,
  }
}

const STORE_DEX_VOLUME_ERROR = "STORE_DEX_VOLUME_ERROR"

export const handler = async (event: IHandlerEvent) => {
  // Timestamp to query, defaults current timestamp
  const currentTimestamp = event.timestamp || (Date.now()) / 1000;
  // Get clean day
  const fetchCurrentDayTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp);

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = getAllChainsFromDexAdapters().filter(canGetBlock)
  const chainBlocks = await getChainBlocks(currentTimestamp, allChains);

  async function runAdapter(id: string, volumeAdapter: VolumeAdapter) {
    const chains = Object.keys(volumeAdapter)
    return allSettled(chains
      .map((chain) => volumeAdapter[chain]
        .fetch(currentTimestamp, chainBlocks)
        .then(result => ({ chain, result }))
        .catch(e => Promise.reject({ chain, error: e, id, timestamp: currentTimestamp }))))
  }

  // TODO: change for allSettled
  const volumeResponses = await Promise.all(event.protocolIndexes.map(async protocolIndex => {
    // Get DEX info
    const { id, volumeAdapter } = volumeAdapters[protocolIndex];

    try {
      // Import DEX adapter
      const dexAdapter: DexAdapter = (await importVolumeAdapter(volumeAdapters[protocolIndex])).default;

      // Retrieve daily volumes
      let rawDailyVolumes: IRecordVolumeData[] = []
      if ("volume" in dexAdapter) {
        const runAdapterRes = await runAdapter(id, dexAdapter.volume)
        const volumes = runAdapterRes.filter(rar => rar.status === 'fulfilled').map(r => r.status === "fulfilled" && r.value)
        for (const volume of volumes) {
          if (volume && volume.result.dailyVolume)
            rawDailyVolumes.push({
              [volume.chain]: {
                [volumeAdapter]: +volume.result.dailyVolume
              },
            })
        }
        const volumesRejected: IAllSettledRejection[] = runAdapterRes.filter(rar => rar.status === 'rejected').map(r => r.status === "rejected" && r.reason) as IAllSettledRejection[]
        processRejectedPromises(volumesRejected, rawDailyVolumes, volumeAdapter)
      } else if ("breakdown" in dexAdapter) {
        const dexBreakDownAdapter = dexAdapter.breakdown
        const volumeAdapters = Object.entries(dexBreakDownAdapter)
        for (const [version, volumeAdapterObj] of volumeAdapters) {
          const runAdapterRes = await runAdapter(id, volumeAdapterObj)
          const volumes = runAdapterRes.filter(rar => rar.status === 'fulfilled').map(r => r.status === "fulfilled" && r.value)
          for (const volume of volumes) {
            if (volume && volume.result.dailyVolume) {
              rawDailyVolumes.push({
                [volume.chain]: {
                  [version]: +volume.result.dailyVolume
                },
              })
            }
          }
          const volumesRejected: IAllSettledRejection[] = runAdapterRes.filter(rar => rar.status === 'rejected').map(r => r.status === "rejected" && r.reason) as IAllSettledRejection[]
          processRejectedPromises(volumesRejected, rawDailyVolumes, volumeAdapter)
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

      await storeVolume(new Volume(VolumeType.dailyVolume, id, fetchCurrentDayTimestamp, dailyVolumes))
    }
    catch (error) {
      const err = error as Error
      console.error(`${STORE_DEX_VOLUME_ERROR}:${volumeAdapter}: ${err.message}`)
      console.error(error)
      throw error
    }
  }))

  // TODO: do something
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
      })
  }
}

export default wrapScheduledLambda(handler);