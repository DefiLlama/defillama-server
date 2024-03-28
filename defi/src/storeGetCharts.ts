import protocols, { Protocol } from "./protocols/data";
import { getHistoricalValues } from "./utils/shared/dynamodb";
import { dailyTvl, getLastRecord, hourlyTvl } from "./utils/getLastRecord";
import { DAY, getClosestDayStartTimestamp, secondsInHour } from "./utils/date";
import {
  getChainDisplayName,
  chainCoingeckoIds,
  transformNewChainName,
  extraSections,
  isDoubleCounted,
  isExcludedFromChainTvl,
} from "./utils/normalizeChain";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { constants, brotliCompress } from "zlib";
import { promisify } from "util";
import { importAdapter } from "./utils/imports/importAdapter";
import { getR2, storeR2, storeR2JSONString } from "./utils/r2";
import { writeToPGCache, PG_CACHE_KEYS, storeRouteData } from "./api2/cache/file-cache";
import { excludeProtocolInCharts } from "./utils/excludeProtocols";

export function sum(sumDailyTvls: SumDailyTvls, chain: string, tvlSection: string, timestampRaw: number, itemTvl: number) {
  const timestamp = getClosestDayStartTimestamp(timestampRaw)
  if (sumDailyTvls[chain] === undefined) {
    sumDailyTvls[chain] = {};
  }
  if (sumDailyTvls[chain][tvlSection] === undefined) {
    sumDailyTvls[chain][tvlSection] = {};
  }
  if (typeof itemTvl === "number" && !Number.isNaN(itemTvl)) {
    sumDailyTvls[chain][tvlSection][timestamp] = itemTvl + (sumDailyTvls[chain][tvlSection][timestamp] ?? 0);
  } else {
    console.log("itemTvl is NaN", itemTvl, chain, timestamp);
  }
}

interface SumDailyTvls {
  [chain: string]: {
    [tvlSection: string]: {
      [timestamp: number]: number | undefined;
    };
  };
}

export interface IProtocol extends Protocol {
  doublecounted: boolean;
}

export type getHistoricalTvlForAllProtocolsOptionalOptions = {
  isApi2CronProcess?: boolean;
  protocolList?: Protocol[];
  getLastTvl?: Function;
  getAllTvlData?: Function;
  getModule?: Function;
  readFromR2Cache?: boolean;
  storeMeta?: boolean;
};

const allProtocolRes: {
  [key: string]: any;
} = {};
export async function getHistoricalTvlForAllProtocols(
  includeBridge: boolean,
  excludeProtocolsFromCharts = true,
  getHistTvlOptions: getHistoricalTvlForAllProtocolsOptionalOptions = {}
) {
  // get last daily timestamp by checking out all protocols most recent tvl value
  let lastDailyTimestamp = 0;
  const protocolList = getHistTvlOptions.protocolList ?? protocols;
  const { storeMeta = false } = getHistTvlOptions;
  const excludedProcolsIds: any = {};
  const excludedProcolsIdsExceptBridge: any = {};

  const historicalProtocolTvls = await Promise.all(
    protocolList.map(async (protocol) => {
      excludedProcolsIds[protocol.id] =
        excludeProtocolInCharts(protocol, false) || isExcludedFromChainTvl(protocol.category);
      excludedProcolsIdsExceptBridge[protocol.id] =
        excludeProtocolInCharts(protocol, true) || isExcludedFromChainTvl(protocol.category);
      if (!protocol || (!storeMeta && excludeProtocolsFromCharts && excludeProtocolInCharts(protocol, includeBridge))) {
        return;
      }

      if (!storeMeta && excludeProtocolsFromCharts && isExcludedFromChainTvl(protocol.category)) {
        return;
      }

      let lastTvl: any, historicalTvl: any, module: any;

      async function _getAllProtocolData(protocol: Protocol) {
        if (!allProtocolRes[protocol.id]) {
          allProtocolRes[protocol.id] = Promise.all([
            getLastRecord(hourlyTvl(protocol.id)),
            getHistoricalValues(dailyTvl(protocol.id)),
            importAdapter(protocol),
          ]);
        }
        return allProtocolRes[protocol.id];
      }

      if (!getHistTvlOptions.isApi2CronProcess) {
        const res = await _getAllProtocolData(protocol);
        lastTvl = res[0];
        historicalTvl = res[1];
        module = res[2];
      } else {
        lastTvl = getHistTvlOptions.getLastTvl!(protocol);
        historicalTvl = getHistTvlOptions.getAllTvlData!(protocol);
        module = getHistTvlOptions.getModule!(protocol);
      }

      if (lastTvl && !historicalTvl?.length) historicalTvl = [lastTvl];

      if (!historicalTvl || historicalTvl?.length < 1 || !module) {
        return;
      }
      // check if protocol is double counted
      const doublecounted = isDoubleCounted(module.doublecounted, protocol.category);

      let protocolData = { ...protocol, doublecounted };

      const lastDailyItem = historicalTvl[historicalTvl.length - 1];

      if (
        lastTvl !== undefined &&
        lastTvl.SK > lastDailyItem.SK &&
        lastDailyItem.SK + secondsInHour * 25 > lastTvl.SK
      ) {
        lastTvl.SK = lastDailyItem.SK;
        historicalTvl[historicalTvl.length - 1] = lastTvl;
      }

      const lastTimestamp = getClosestDayStartTimestamp(historicalTvl[historicalTvl.length - 1].SK);

      lastDailyTimestamp = Math.max(lastDailyTimestamp, lastTimestamp);

      return {
        protocol: protocolData,
        historicalTvl: historicalTvl as {
          [section: string]: any;
        }[],
        lastTimestamp,
      };
    })
  );

  if (storeMeta)
    return {
      excludedProcolsIds,
      excludedProcolsIdsExceptBridge,
      lastDailyTimestamp,
      historicalProtocolTvls,
    };

  return {
    lastDailyTimestamp,
    historicalProtocolTvls,
  };
}

export type TvlItem = { [section: string]: any };
export type processProtocolsOption = getHistoricalTvlForAllProtocolsOptionalOptions & {
  includeBridge: boolean;
};

export async function getCachedHistoricalTvlForAllProtocols(
  includeBridge = false,
  excludeProtocolsFromCharts = true,
  {
    getHistTvlMeta,
  }: {
    getHistTvlMeta?: Function;
  } = {}
) {
  includeBridge = includeBridge === true;
  excludeProtocolsFromCharts = excludeProtocolsFromCharts === true;

  if (getHistTvlMeta) {
    const { excludedProcolsIds, excludedProcolsIdsExceptBridge, lastDailyTimestamp, historicalProtocolTvls } =
      await getHistTvlMeta();

    const filteredHistoricalProtocolTvls = historicalProtocolTvls.map((i: any) => {
      if (!excludeProtocolsFromCharts) return i; // if excludeProtocolsFromCharts is false, return all protocols

      if (!i?.protocol?.id) return i; // if protocol is undefined/id is missing, return it
      const id = i.protocol.id;

      if (includeBridge) {
        if (!excludedProcolsIdsExceptBridge[id]) return i; // it might be a bridge protocol but not excluded, return it
      } else if (!excludedProcolsIds[id]) {
        return i; // if protocol is excluded, return undefined
      }
      return;
    });

    return {
      lastDailyTimestamp,
      historicalProtocolTvls: filteredHistoricalProtocolTvls,
    };
  }

  return JSON.parse(
    (await getR2(`cache/getHistoricalTvlForAllProtocols/${includeBridge}-${excludeProtocolsFromCharts}.json`)).body!
  );
}

export async function processProtocols(
  processor: (timestamp: number, tvlItem: TvlItem, protocol: IProtocol) => Promise<void>,
  { includeBridge, ...getHistTvlOptions }: processProtocolsOption,
  excludeProtocolsFromCharts = true
) {
  let historicalProtocolTvlsData: Awaited<ReturnType<typeof getHistoricalTvlForAllProtocols>>;

  if (getHistTvlOptions.isApi2CronProcess) {
    historicalProtocolTvlsData = await getHistoricalTvlForAllProtocols(
      includeBridge,
      excludeProtocolsFromCharts,
      getHistTvlOptions
    );
  } else {
    historicalProtocolTvlsData = await getCachedHistoricalTvlForAllProtocols(includeBridge, excludeProtocolsFromCharts);
  }
  const { historicalProtocolTvls, lastDailyTimestamp } = historicalProtocolTvlsData;

  historicalProtocolTvls.forEach((protocolTvl) => {
    if (!protocolTvl) {
      return;
    }

    let { historicalTvl, protocol, lastTimestamp } = protocolTvl;

    const mostRecentTvl = historicalTvl[historicalTvl.length - 1];
    // check if protocol's most recent tvl value is lastDailyTimestamo of all protocols, if not update its latest tvl value timestamp to its closest day start time
    while (lastTimestamp < lastDailyTimestamp) {
      lastTimestamp = getClosestDayStartTimestamp(lastTimestamp + 24 * secondsInHour);
      historicalTvl.push({
        ...mostRecentTvl,
        SK: lastTimestamp,
      });
    }

    let oldestTimestamp = getClosestDayStartTimestamp(historicalTvl[0].SK);

    historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      while (timestamp - oldestTimestamp > 1.5 * DAY) {
        oldestTimestamp = getClosestDayStartTimestamp(oldestTimestamp + DAY);
        processor(oldestTimestamp, item, protocol);
      }
      processor(timestamp, item, protocol);
      oldestTimestamp = timestamp;
    });
  });
}

export async function storeGetCharts({ ...options }: any = {}) {
  // store overall tvl charts and individual chain charts
  const sumDailyTvls: SumDailyTvls = {};
  const sumCategoryTvls: SumDailyTvls = {};

  if (options.isApi2CronProcess) {
    const data = await getHistoricalTvlForAllProtocols(false, false, { ...options, storeMeta: true });
    // await storeR2JSONString("cache/getHistoricalTvlForAllProtocols/meta.json", JSON.stringify(await data))
    await writeToPGCache(PG_CACHE_KEYS.HISTORICAL_TVL_DATA_META, data);
    // TODO: I hope cache/getHistoricalTvlForAllProtocols/false-true.json is not used anywhere else
  } else {
    const dataFalseTrue = getHistoricalTvlForAllProtocols(false, true, options);
    const dataFalseFalse = getHistoricalTvlForAllProtocols(false, false, options);
    await storeR2JSONString(
      "cache/getHistoricalTvlForAllProtocols/false-true.json",
      JSON.stringify(await dataFalseTrue)
    );
    await storeR2JSONString(
      "cache/getHistoricalTvlForAllProtocols/false-false.json",
      JSON.stringify(await dataFalseFalse)
    );
  }

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
      // total - sum of all protocols on all chains

      sum(sumDailyTvls, "total", "tvl", timestamp, item.tvl);

      // doublecounted and liquid staking values === sum of tvl on all chains
      if (protocol.doublecounted) {
        sum(sumDailyTvls, "total", "doublecounted", timestamp, item.tvl);
      }
      if (protocol.category?.toLowerCase() === "liquid staking") {
        sum(sumDailyTvls, "total", "liquidstaking", timestamp, item.tvl);
      }

      // if protocol is under liquid staking category and is double counted, track those values so we dont add tvl twice
      if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
        sum(sumDailyTvls, "total", "dcAndLsOverlap", timestamp, item.tvl);
      }

      let hasAtLeastOneChain = false;

      Object.entries(item).forEach(([chain, tvl]) => {
        // formatted chain name maybe chainName (ethereum, solana etc) or extra tvl sections (staking, pool2 etc)
        const formattedChainName = getChainDisplayName(chain, true);

        // if its and extra tvl, include those values in "total" tvl of defi
        if (extraSections.includes(formattedChainName)) {
          sum(sumDailyTvls, "total", formattedChainName, timestamp, tvl);
          return;
        }

        // get tvl of individual chain (ethereum, ethereum-staking etc)
        const [chainName, tvlSection] = formattedChainName.includes("-")
          ? formattedChainName.split("-")
          : [formattedChainName, "tvl"];

        //  check if its a valid chain name and not extra tvl section like pool2, staking etc
        if (chainCoingeckoIds[chainName] !== undefined) {
          sum(sumDailyTvls, chainName, tvlSection, timestamp, tvl);

          // doublecounted and liquidstaking === tvl on the chain, so check if tvlSection is not staking, pool2 etc

          if (tvlSection === "tvl") {
            sum(sumCategoryTvls, (protocol.category || "").toLowerCase().replace(" ", "_"), chain, timestamp, tvl);
            if (protocol?.doublecounted) {
              sum(sumDailyTvls, chainName, "doublecounted", timestamp, tvl);
            }
            if (protocol.category?.toLowerCase() === "liquid staking") {
              sum(sumDailyTvls, chainName, "liquidstaking", timestamp, tvl);
            }

            if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
              sum(sumDailyTvls, chainName, "dcAndLsOverlap", timestamp, tvl);
            }
          }

          //  if its a valid chain name, record that this protocol is on atleast more than one chain
          // reason to track this value is if a protocol is only on single chain, then it would only have 'tvl' in the above tvlSection value
          // and you want this protocol to appear on 'All Chains' page and its individual chain
          hasAtLeastOneChain = true;
        }
      });

      if (hasAtLeastOneChain === false) {
        const chainName = transformNewChainName(protocol.chain);

        sum(sumDailyTvls, chainName, "tvl", timestamp, item.tvl);

        // doublecounted and liquid staking values === sum of tvl on the chain this protocol exists
        if (protocol.doublecounted) {
          sum(sumDailyTvls, chainName, "doublecounted", timestamp, item.tvl);
        }
        if (protocol.category?.toLowerCase() === "liquid staking") {
          sum(sumDailyTvls, chainName, "liquidstaking", timestamp, item.tvl);
        }

        if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
          sum(sumDailyTvls, chainName, "dcAndLsOverlap", timestamp, item.tvl);
        }
      }
    },
    { includeBridge: false, ...options }
  );

  await Promise.all(
    Object.entries(sumDailyTvls).map(async ([chain, chainDailyTvls]) => {
      const chainResponse = Object.fromEntries(
        Object.entries(chainDailyTvls).map(([section, tvls]) => [section, Object.entries(tvls)])
      );
      let filename = chain === "total" ? "lite/charts" : `lite/charts/${chain}`;

      if (options.isApi2CronProcess) {
        if (chain === "total") filename = "lite/charts-total";

        await storeRouteData(filename, chainResponse);
      } else {
        const compressedRespone = await promisify(brotliCompress)(JSON.stringify(chainResponse), {
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        });
        await storeR2(filename, compressedRespone, true);
      }
    })
  );

  await Promise.all(
    Object.entries(sumCategoryTvls).map(async ([category, chainDailyTvls]) => {
      const chainResponse = Object.fromEntries(
        Object.entries(chainDailyTvls).map(([section, tvls]) => [section, Object.entries(tvls)])
      );
      let filename = `lite/charts/categories/${category}`;

      if (options.isApi2CronProcess) {
        await storeRouteData(filename, chainResponse);
      } 
      else {
        const compressedRespone = await promisify(brotliCompress)(JSON.stringify(chainResponse), {
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        });
        await storeR2(filename, compressedRespone, true);
      }
    })
  );
}

const handler = async (_event: any) => {
  await storeGetCharts();
};

export default wrapScheduledLambda(handler);
