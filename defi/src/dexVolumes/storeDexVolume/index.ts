import { getChainBlocks } from "@defillama/sdk/build/computeTVL/blocks";

import { wrapScheduledLambda } from "../../utils/shared/wrap";
import { getTimestampAtStartOfDayUTC } from "../../utils/date";
import volumeAdapters from "../dexAdapters";
import { DexAdapter, VolumeAdapter } from "../../../DefiLlama-Adapters/dexVolumes/dexVolume.type";
import { Chain } from "@defillama/sdk/build/general";
import { handleAdapterError } from "../utils";
import { storeVolume, Volume, VolumeType } from "../data/volume";

// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

interface IHandlerEvent {
  protocolIndexes: number[]
  timestamp?: number
}

export interface IRecordVolumeData {
  [chain: string]: {
    [protocolVersion: string]: number | undefined,
  }
}

export const handler = async (event: IHandlerEvent) => {
  // Timestamp to query, defaults current timestamp
  const currentTimestamp = event.timestamp || Date.now() / 1000;
  // Get clean day
  const fetchCurrentHourTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp);
  // Get closest block to clean hour

  // TODO: generate from modules
  const uniswapChains: Chain[] = ["ethereum", "arbitrum", "polygon", "optimism"]
  const chainBlocks = await getChainBlocks(fetchCurrentHourTimestamp, uniswapChains);

  async function runAdapter(volumeAdapter: VolumeAdapter) {
    const chains = Object.keys(volumeAdapter)
    return Promise.all(chains.map((chain) => volumeAdapter[chain].fetch(currentTimestamp, chainBlocks).then(result => ({ chain, result })).catch(handleAdapterError)))
  }

  // TODO: change for allSettled
  const volumeResponses = await Promise.all(event.protocolIndexes.map(async protocolIndex => {
    // Get DEX info
    const { id, volumeAdapter } = volumeAdapters[protocolIndex];

    // Import DEX adapter
    const dexAdapter: DexAdapter = (await import(
      `../../../DefiLlama-Adapters/dexVolumes/${volumeAdapter}`)
    ).default;

    // Retrieve daily volumes
    let rawDailyVolumes: IRecordVolumeData[] = []
    if ("volume" in dexAdapter) {
      const volumes = await runAdapter(dexAdapter.volume)
      for (const volume of volumes) {
        if (volume && volume.result.dailyVolume)
          rawDailyVolumes.push({
            [volume.chain]: {
              [volumeAdapter]: +volume.result.dailyVolume
            },
          })
      }
    } else if ("breakdown" in dexAdapter) {
      const dexBreakDownAdapter = dexAdapter.breakdown
      const volumeAdapters = Object.entries(dexBreakDownAdapter)
      for (const [version, volumeAdapter] of volumeAdapters) {
        const volumes = await runAdapter(volumeAdapter)
        for (const volume of volumes) {
          if (volume && volume.result.dailyVolume) {
            rawDailyVolumes.push({
              [volume.chain]: {
                [version]: +volume.result.dailyVolume
              },
            })
          }
        }
      }
    } else console.error("Invalid adapter")
    const dailyVolumes = rawDailyVolumes.reduce((acc, current: IRecordVolumeData) => {
      const chain = Object.keys(current)[0]
      acc[chain] = {
        ...acc[chain],
        ...current[chain]
      }
      return acc
    }, {} as IRecordVolumeData)

    const v = new Volume(VolumeType.dailyVolume, id, fetchCurrentHourTimestamp, dailyVolumes)
    await storeVolume(v)
  }))

  // TODO: check if all adapters were success
  console.log(volumeResponses)
  return
};

export default wrapScheduledLambda(handler);