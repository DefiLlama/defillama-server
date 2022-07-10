import {
  chainsForBlocks,
  getChainBlocks,
} from "@defillama/sdk/build/computeTVL/blocks";
import BigNumber from "bignumber.js";

import { wrapScheduledLambda } from "../../utils/shared/wrap";
import {
  getTimestampAtStartOfDayUTC,
  getTimestampAtStartOfHour,
  getTimestampAtStartOfMonth,
} from "../../utils/date";
import {
  dailyDexVolumeDb,
  hourlyDexVolumeDb,
  monthlyDexVolumeDb,
  getHourlyDexVolumeRecord,
  getMonthlyDexVolumeRecord,
  getDexVolumeMetaRecord,
} from "../dexVolumeRecords";
import dexVolumes from "../../protocols/dexVolumes";
import { ChainBlocks, DexAdapter, VolumeAdapter } from "../../../DefiLlama-Adapters/dexVolumes/dexVolume.type";
import { Chain } from "@defillama/sdk/build/general";
import { handleAdapterError } from "../utils";

// Runs a little bit past each hour, but calls function with timestamp on the hour to allow blocks to sync for high throughput chains. Does not work for api based with 24/hours

interface IHandlerEvent {
  protocolIndexes: number[]
  timestamp?: number
}

export const handler = async (event: IHandlerEvent) => {
  // Timestamp to query, defaults current timestamp
  const currentTimestamp = event.timestamp || Date.now() / 1000;
  // Get clean hour
  const fetchCurrentHourTimestamp = getTimestampAtStartOfHour(currentTimestamp);
  // Get closest block to clean hour

  // TODO: generate from modules
  const uniswapChains: Chain[] = ["ethereum", "arbitrum", "polygon", "optimism"]
  const chainBlocks = await getChainBlocks(fetchCurrentHourTimestamp, uniswapChains);

  interface IRunAdapterResult {
    chain: string,
    dailyVolume: number,
    version?: string,
  }
  async function runAdapter(volumeAdapter: VolumeAdapter) {
    const chains = Object.keys(volumeAdapter)
    return Promise.all(chains.map((chain) => volumeAdapter[chain].fetch(currentTimestamp, chainBlocks).then(result => ({ chain, result })).catch(handleAdapterError)))
  }

  // TODO: change for allSettled
  const volumeResponses = await Promise.all(event.protocolIndexes.map(async protocolIndex => {
    // Get DEX info
    const { id, name, module } = dexVolumes[protocolIndex];
    console.log("starting", id, name, module, "adapter!")

    // Import DEX adapter
    const dexAdapter: DexAdapter = (await import(
      `../../../DefiLlama-Adapters/dexVolumes/${module}`)
    ).default;

    // Retrieve daily volumes
    let dailyVolumes: IRunAdapterResult[] = []
    if ("volume" in dexAdapter) {
      const volumes = await runAdapter(dexAdapter.volume)
      for (const volume of volumes) {
        if (volume && volume.result.dailyVolume)
          dailyVolumes.push({
            chain: volume.chain,
            dailyVolume: +volume.result.dailyVolume
          })
      }
    } else if ("breakdown" in dexAdapter) {
      const dexBreakDownAdapter = dexAdapter.breakdown
      const volumeAdapters = Object.entries(dexBreakDownAdapter)
      for (const [version, volumeAdapter] of volumeAdapters) {
        const volumes = await runAdapter(volumeAdapter)
        for (const volume of volumes) {
          if (volume && volume.result.dailyVolume) {
            dailyVolumes.push({
              chain: volume.chain,
              dailyVolume: +volume.result.dailyVolume,
              version
            })
          }
        }
      }
    } else console.error("Invalid adapter")

    for (const dailyVolume of dailyVolumes) {
      console.log(dailyVolume)
    }

  }))

  // TODO: check if all adapters were success
  console.log(volumeResponses)
  return
  /////////////////////
  const savedHourTimestamp = fetchCurrentHourTimestamp - 3600;
  const prevHourlyTimestamp = savedHourTimestamp - 3600;
  const dailyTimestamp = getTimestampAtStartOfDayUTC(currentTimestamp);
  const startOfDay = fetchCurrentHourTimestamp === dailyTimestamp;
  const startNewDailyVolume = savedHourTimestamp === dailyTimestamp;
  // if 12:00 am on first day of month add the current calculated volume to prev month
  const monthlyTimestamp = getTimestampAtStartOfMonth(currentTimestamp - 3600);
  /////////////////////
  event.protocolIndexes.forEach(async (index: number) => {
    const { id, name, module } = dexVolumes[index];
    console.log("dex data:", id, name, module)
    const dexVolumeAdapter = (await import(
      `../../../DefiLlama-Adapters/dexVolumes/${module}`)
    ).default;
    console.log("dexVolumeAdapter", dexVolumeAdapter)
    const r = dexVolumeAdapter.volume.fetch
    console.log("result fetch", typeof r, dexVolumeAdapter.volume)
    const ecosystemFetches = Object.entries(dexVolumeAdapter.volume.fetch).map(
      async ([ecosystem, ecosystemFetch]: [string, any]) => {
        let ecosystemFetchResult;

        try {
          ecosystemFetchResult = await ecosystemFetch(
            fetchCurrentHourTimestamp,
            chainBlocks
          );
        } catch (e) {
          const errorName = `fetch-${name}-${ecosystem}-${fetchCurrentHourTimestamp}`;
          console.error("dex-volume", errorName, e);
          throw e;
        }

        return { [ecosystem]: ecosystemFetchResult };
      }
    );

    const protocolVolumes = (await Promise.all(ecosystemFetches)).reduce(
      (acc, volume) => ({ ...acc, ...volume }),
      {}
    );

    console.log(protocolVolumes, "protocolVolumes");

    const getPrevRecords = await Promise.all([
      getHourlyDexVolumeRecord(id, prevHourlyTimestamp),
      getMonthlyDexVolumeRecord(id, monthlyTimestamp),
      getDexVolumeMetaRecord(id),
    ]).catch((e) => {
      const errorName = `fetch-prevdata-${name}-${fetchCurrentHourTimestamp}`;
      console.error("dex-volume", errorName, e);
      throw e;
    });

    console.log(getPrevRecords)

    const lastUpdatedData = getPrevRecords[0];
    const monthlyData = getPrevRecords[1];
    const dexGeneralData = getPrevRecords[2];
    const { backfilledTotalVolume } = dexGeneralData;

    // Marks this hourly's volume as inaccurate
    const validPrevHour = !!lastUpdatedData;

    let sumTotalVolume = new BigNumber(0);
    let sumDailyVolume = new BigNumber(0);
    let sumHourlyVolume = new BigNumber(0);
    let sumMonthlyVolume = new BigNumber(monthlyData?.monthlyVolume || 0);

    const newEcosystemHourlyVolumes: {
      [x: string]: {
        [y: string]: string;
      };
    } = {};

    const newEcosystemDailyVolumes: {
      [x: string]: {
        [y: string]: string;
      };
    } = {};

    const newEcosystemTotalVolumes: {
      [x: string]: {
        [y: string]: string;
      };
    } = {};

    const newEcosystemMonthlyVolumes: {
      [x: string]: {
        [y: string]: string;
      };
    } = {};

    // let validTotalVolume = true;
    // let validDailyVolume = true;
    // let validHourlyVolume = true;

    // Calc all ecosystem total, daily, hourly volumes and sum them
    Object.entries(protocolVolumes).map(([ecosystem, ecosystemVolume]) => {
      const { totalVolume, dailyVolume, hourlyVolume } = ecosystemVolume;

      const validTotalVolume = typeof totalVolume !== "undefined";
      const validDailyVolume = typeof dailyVolume !== "undefined";
      const validHourlyVolume = typeof hourlyVolume !== "undefined";

      newEcosystemHourlyVolumes[ecosystem] = {};
      newEcosystemDailyVolumes[ecosystem] = {};
      newEcosystemMonthlyVolumes[ecosystem] = {};
      newEcosystemTotalVolumes[ecosystem] = {};

      // Calculate TotalVolume, if no daily or hourly calc them too
      if (validTotalVolume) {
        const bigNumberTotalVol = new BigNumber(totalVolume);
        newEcosystemTotalVolumes[ecosystem].totalVolume =
          bigNumberTotalVol.toString();
        sumTotalVolume = sumTotalVolume.plus(bigNumberTotalVol);

        const totalVolDiff = bigNumberTotalVol.minus(
          new BigNumber(
            lastUpdatedData?.ecosystems?.[ecosystem]?.totalVolume || 0
          )
        );

        // Assumes previous data is correct, need to either ensure backfill has prev hour, if api make sure to lock in dex-volume and release once an hourly has been recorded
        if (validPrevHour) {
          newEcosystemMonthlyVolumes[ecosystem].monthlyVolume = new BigNumber(
            monthlyData?.ecosystems?.[ecosystem]?.monthlyVolume || 0
          )
            .plus(totalVolDiff)
            .toString();
          sumMonthlyVolume = sumMonthlyVolume.plus(totalVolDiff);
        }

        if (!validDailyVolume || startNewDailyVolume) {
          let calcDailyVolume = totalVolDiff;
          if (prevHourlyTimestamp !== dailyTimestamp) {
            calcDailyVolume = calcDailyVolume.plus(
              new BigNumber(
                lastUpdatedData?.ecosystems?.[ecosystem]?.dailyVolume
              )
            );
          }

          newEcosystemDailyVolumes[ecosystem].dailyVolume =
            calcDailyVolume.toString();
          sumDailyVolume = sumDailyVolume.plus(calcDailyVolume);
        }

        if (!validHourlyVolume) {
          let calcHourlyVolume = bigNumberTotalVol.minus(
            new BigNumber(
              lastUpdatedData?.ecosystems?.[ecosystem]?.totalVolume || 0
            )
          );
          newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
            calcHourlyVolume.toString();
          sumHourlyVolume.plus(calcHourlyVolume);
        }
      }

      // Calc daily, if no hourly and total, calc hourly
      if (validDailyVolume) {
        const bigNumberDailyVol = new BigNumber(dailyVolume);
        newEcosystemDailyVolumes[ecosystem].dailyVolume =
          bigNumberDailyVol.toString();
        sumDailyVolume = bigNumberDailyVol;

        const dailyVolDiff = bigNumberDailyVol.minus(
          new BigNumber(
            lastUpdatedData?.ecosystems?.[ecosystem]?.dailyVolume || 0
          )
        );

        if (!validTotalVolume && validPrevHour) {
          newEcosystemMonthlyVolumes[ecosystem].monthlyVolume = new BigNumber(
            monthlyData?.ecosystems?.[ecosystem]?.monthlyVolume || 0
          )
            .plus(dailyVolDiff)
            .toString();
          sumMonthlyVolume = sumMonthlyVolume.plus(dailyVolDiff);
        }

        if (!validHourlyVolume && !validTotalVolume) {
          if (startOfDay) {
            newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
              bigNumberDailyVol.toString();
            sumHourlyVolume.plus(bigNumberDailyVol);

            // if (backfilledTotalVolume && validPrevHour) {
            //   const current
            //   newEcosystemTotalVolumes[ecosystem].totalVolume =
            //     bigNumberDailyVol.toString();
            //   sumTotalVolume = sumTotalVolume.plus(bigNumberTotalVol);
            // }
          } else {
            let calcHourlyVolume = dailyVolDiff;
            newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
              calcHourlyVolume.toString();
            sumHourlyVolume.plus(calcHourlyVolume);
          }
        }
      }

      if (validHourlyVolume) {
        const bigNumberHourlyVol = new BigNumber(hourlyVolume);
        newEcosystemHourlyVolumes[ecosystem].hourlyVolume =
          bigNumberHourlyVol.toString();
        sumHourlyVolume.plus(bigNumberHourlyVol);

        if (!validTotalVolume && !validDailyVolume) {
          newEcosystemMonthlyVolumes[ecosystem].monthlyVolume = new BigNumber(
            monthlyData?.ecosystems?.[ecosystem]?.[monthlyVolume] || 0
          )
            .plus(bigNumberHourlyVol)
            .toString();
          sumMonthlyVolume = sumMonthlyVolume.plus(bigNumberHourlyVol);
        }
      }
    });

    const totalVolume = sumTotalVolume.toString();
    const dailyVolume = sumDailyVolume.toString();
    const hourlyVolume = sumHourlyVolume.toString();
    const monthlyVolume = sumMonthlyVolume.toString();

    const hourlyEcosystemVolumes = Object.keys(
      newEcosystemHourlyVolumes
    ).reduce((acc: any, curr) => {
      acc[curr] = {
        hourlyVolume: newEcosystemHourlyVolumes[curr].hourlyVolume,
        dailyVolume: newEcosystemDailyVolumes[curr].dailyVolume,
        totalVolume: newEcosystemTotalVolumes[curr].totalVolume,
      };
      return acc;
    }, {});

    const dailyEcosystemVolumes = Object.keys(newEcosystemDailyVolumes).reduce(
      (acc: any, curr) => {
        acc[curr] = {
          dailyVolume: newEcosystemDailyVolumes[curr].dailyVolume,
          totalVolume: newEcosystemTotalVolumes[curr].totalVolume,
        };
        return acc;
      },
      {}
    );

    const monthlyEcosystemVolumes = Object.keys(
      newEcosystemMonthlyVolumes
    ).reduce((acc: any, curr) => {
      acc[curr] = {
        monthlyVolume: newEcosystemMonthlyVolumes[curr].monthlyVolume,
        totalVolume: newEcosystemTotalVolumes[curr].totalVolume,
      };
      return acc;
    }, {});

    hourlyDexVolumeDb.put({
      id,
      unix: savedHourTimestamp,
      hourlyVolume,
      dailyVolume,
      totalVolume,
      validPrevHour,
      ecosystems: hourlyEcosystemVolumes,
    });

    dailyDexVolumeDb.put({
      id,
      unix: dailyTimestamp,
      dailyVolume,
      totalVolume,
      ecosystems: dailyEcosystemVolumes,
    });

    monthlyDexVolumeDb.put({
      id,
      unix: monthlyTimestamp,
      monthlyVolume,
      totalVolume,
      ecosystems: monthlyEcosystemVolumes,
    });
  });
};

export default wrapScheduledLambda(handler);