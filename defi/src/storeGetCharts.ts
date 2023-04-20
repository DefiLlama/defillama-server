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
import { storeR2 } from "./utils/r2";

export function sum(sumDailyTvls: SumDailyTvls, chain: string, tvlSection: string, timestamp: number, itemTvl: number) {
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

export function excludeProtocolInCharts(protocol: Protocol, includeBridge?: boolean) {
  let exclude = false;
  const excludedCategories = ['Chain', 'CEX', 'Infrastructure', 'Staking Pool']

  if (excludedCategories.includes(protocol.category!)) {
    return true;
  }

  if (!includeBridge) {
    exclude = protocol.name === "AnySwap" || protocol.category === "Bridge";
  }

  return exclude;
}

export async function getHistoricalTvlForAllProtocols(includeBridge: boolean) {
  // get last daily timestamp by checking out all protocols most recent tvl value
  let lastDailyTimestamp = 0;

  const historicalProtocolTvls = await Promise.all(
    protocols.map(async (protocol) => {
      if (!protocol || excludeProtocolInCharts(protocol, includeBridge)) {
        return;
      }

      const [lastTvl, historicalTvl, module] = await Promise.all([
        getLastRecord(hourlyTvl(protocol.id)),
        getHistoricalValues(dailyTvl(protocol.id)),
        importAdapter(protocol),
      ]);

      if (historicalTvl.length < 1 || !module) {
        return;
      }

      if(isExcludedFromChainTvl(protocol.category)){
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

  return {
    lastDailyTimestamp,
    historicalProtocolTvls,
  };
}

export type TvlItem = { [section: string]: any };

export async function processProtocols(
  processor: (timestamp: number, tvlItem: TvlItem, protocol: IProtocol) => Promise<void>,
  { includeBridge }: { includeBridge: boolean }
) {
  const { historicalProtocolTvls, lastDailyTimestamp } = await getHistoricalTvlForAllProtocols(includeBridge);

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

const handler = async (_event: any) => {
  // store overall tvl charts and individual chain charts
  const sumDailyTvls: SumDailyTvls = {};

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
    { includeBridge: false }
  );

  await Promise.all(
    Object.entries(sumDailyTvls).map(async ([chain, chainDailyTvls]) => {
      const chainResponse = Object.fromEntries(
        Object.entries(chainDailyTvls).map(([section, tvls]) => [section, Object.entries(tvls)])
      );
      const compressedRespone = await promisify(brotliCompress)(JSON.stringify(chainResponse), {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      });
      const filename = chain === "total" ? "lite/charts" : `lite/charts/${chain}`;
      await storeR2(filename, compressedRespone, true);
    })
  );
};

export default wrapScheduledLambda(handler);
