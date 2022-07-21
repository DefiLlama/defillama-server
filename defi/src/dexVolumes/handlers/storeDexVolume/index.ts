import { getChainBlocks } from "@defillama/sdk/build/computeTVL/blocks";
import { wrapScheduledLambda } from "../../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC } from "../../../utils/date";
import volumeAdapters from "../../dexAdapters";
import { ChainBlocks, DexAdapter, VolumeAdapter } from "@defillama/adapters/dexVolumes/dexVolume.type";
import { handleAdapterError } from "../../utils";
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
    [protocolVersion: string]: number | undefined | string,
  }
}

export const handler = async (event: IHandlerEvent) => {
  // Timestamp to query, defaults current timestamp - 10 min
  const currentTimestamp = event.timestamp || (Date.now() - 1000 * 60 * 10) / 1000;
  // Get clean day
  const fetchCurrentHourTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp);

  // Get closest block to clean day. Only for EVM compatible ones.
  const allChains = getAllChainsFromDexAdapters().filter(canGetBlock)
  const chainBlocks = await getChainBlocks(currentTimestamp, allChains);

  async function runAdapter(volumeAdapter: VolumeAdapter) {
    const chains = Object.keys(volumeAdapter)
    return allSettled(chains.map((chain) => volumeAdapter[chain].fetch(currentTimestamp, chainBlocks).then(result => ({ chain, result })).catch(e => Promise.reject({ chain, error: e }))))
  }

  // TODO: change for allSettled
  const volumeResponses = await Promise.all(event.protocolIndexes.map(async protocolIndex => {
    // Get DEX info
    const { id, volumeAdapter } = volumeAdapters[protocolIndex];

    // Import DEX adapter
    const dexAdapter: DexAdapter = (await importVolumeAdapter(volumeAdapters[protocolIndex])).default;

    // Retrieve daily volumes
    let rawDailyVolumes: IRecordVolumeData[] = []
    if ("volume" in dexAdapter) {
      const runAdapterRes = await runAdapter(dexAdapter.volume)
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
      processRejectedPromises(volumesRejected, rawDailyVolumes)
    } else if ("breakdown" in dexAdapter) {
      const dexBreakDownAdapter = dexAdapter.breakdown
      const volumeAdapters = Object.entries(dexBreakDownAdapter)
      for (const [version, volumeAdapter] of volumeAdapters) {
        const runAdapterRes = await runAdapter(volumeAdapter)
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
        processRejectedPromises(volumesRejected, rawDailyVolumes)
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

    await storeVolume(new Volume(VolumeType.dailyVolume, id, fetchCurrentHourTimestamp, dailyVolumes))
  }))

  // TODO: do something
  return
};

interface IAllSettledRejection {
  chain: string
  error: Error
}
function processRejectedPromises(volumesRejected: IAllSettledRejection[], rawDailyVolumes: IRecordVolumeData[]) {
  for (const rejVolumes of volumesRejected) {
    if (rejVolumes)
      rawDailyVolumes.push({
        [rejVolumes.chain]: {
          error: rejVolumes.error.message
        },
      })
  }
}

export default wrapScheduledLambda(handler);