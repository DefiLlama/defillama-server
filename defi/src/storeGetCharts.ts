import protocols, { Protocol } from './protocols/data';
import { getHistoricalValues } from './utils/shared/dynamodb';
import { dailyTvl, getLastRecord, hourlyTvl } from './utils/getLastRecord';
import { DAY, getClosestDayStartTimestamp, secondsInHour } from './utils/date';
import { getChainDisplayName, chainCoingeckoIds, transformNewChainName, extraSections } from './utils/normalizeChain';
import { wrapScheduledLambda } from './utils/shared/wrap';
import { store } from './utils/s3';
import { constants, brotliCompress } from 'zlib';
import { promisify } from 'util';
import { importAdapter } from './utils/imports/importAdapterJSON';

function sum(sumDailyTvls: SumDailyTvls, chain: string, tvlSection: string, timestamp: number, itemTvl: number) {
  if (sumDailyTvls[chain] === undefined) {
    sumDailyTvls[chain] = {};
  }
  if (sumDailyTvls[chain][tvlSection] === undefined) {
    sumDailyTvls[chain][tvlSection] = {};
  }
  if (typeof itemTvl === 'number' && !Number.isNaN(itemTvl)) {
    sumDailyTvls[chain][tvlSection][timestamp] = itemTvl + (sumDailyTvls[chain][tvlSection][timestamp] ?? 0);
  } else {
    console.log('itemTvl is NaN', itemTvl, chain, timestamp);
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

export function excludeProtocolInCharts(protocol: Protocol) {
  return protocol.category === 'Chain' || protocol.name === 'AnySwap' || protocol.category === 'Bridge';
}

export async function getHistoricalTvlForAllProtocols() {
  let lastDailyTimestamp = 0;
  const historicalProtocolTvls = await Promise.all(
    protocols.map(async (protocol) => {
      if (excludeProtocolInCharts(protocol)) {
        return undefined;
      }
      const [lastTvl, historicalTvl, module] = await Promise.all([
        getLastRecord(hourlyTvl(protocol.id)),
        getHistoricalValues(dailyTvl(protocol.id)),
        importAdapter(protocol),
      ]);
      if (historicalTvl.length < 1) {
        return undefined;
      }

      const doublecounted =
      module.doublecounted ?? (protocol.category === 'Yield Aggregator' || protocol.category === 'Yield');
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
  processor: (timestamp: number, tvlItem: TvlItem, protocol: IProtocol) => Promise<void>
) {
  const { historicalProtocolTvls, lastDailyTimestamp } = await getHistoricalTvlForAllProtocols();
  historicalProtocolTvls.forEach((protocolTvl) => {
    if (protocolTvl === undefined) {
      return;
    }
    let { historicalTvl, protocol, lastTimestamp } = protocolTvl;
    const lastTvl = historicalTvl[historicalTvl.length - 1];
    while (lastTimestamp < lastDailyTimestamp) {
      lastTimestamp = getClosestDayStartTimestamp(lastTimestamp + 24 * secondsInHour);
      historicalTvl.push({
        ...lastTvl,
        SK: lastTimestamp,
      });
    }
    let last = getClosestDayStartTimestamp(historicalTvl[0].SK);
    historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      while (timestamp - last > 1.5 * DAY) {
        last = getClosestDayStartTimestamp(last + DAY);
        processor(last, item, protocol);
      }
      processor(timestamp, item, protocol);
      last = timestamp;
    });
  });
}

const handler = async (_event: any) => {
  const sumDailyTvls = {} as SumDailyTvls;

  await processProtocols(async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
    sum(sumDailyTvls, 'total', 'tvl', timestamp, item.tvl);
    if (protocol.doublecounted) {
      sum(sumDailyTvls, 'total', 'doublecounted', timestamp, item.tvl);
    }
    let hasAtLeastOneChain = false;
    Object.entries(item).forEach(([chain, tvl]) => {
      const formattedChainName = getChainDisplayName(chain, true);
      if (extraSections.includes(formattedChainName)) {
        sum(sumDailyTvls, 'total', formattedChainName, timestamp, tvl);
        return;
      }
      const [chainName, tvlSection] = formattedChainName.includes('-')
        ? formattedChainName.split('-')
        : [formattedChainName, 'tvl'];
      if (chainCoingeckoIds[chainName] !== undefined) {
        sum(sumDailyTvls, chainName, tvlSection, timestamp, tvl);
        if (protocol?.doublecounted && tvlSection === 'tvl') {
          sum(sumDailyTvls, chainName, 'doublecounted', timestamp, tvl);
        }
        hasAtLeastOneChain = true;
      }
    });
    if (hasAtLeastOneChain === false) {
      const chainName = transformNewChainName(protocol.chain);
      sum(sumDailyTvls, chainName, 'tvl', timestamp, item.tvl);
      if (protocol.doublecounted) {
        sum(sumDailyTvls, chainName, 'doublecounted', timestamp, item.tvl);
      }
    }
  });

  await Promise.all(
    Object.entries(sumDailyTvls).map(async ([chain, chainDailyTvls]) => {
      const chainResponse = Object.fromEntries(
        Object.entries(chainDailyTvls).map(([section, tvls]) => [section, Object.entries(tvls)])
      );
      const compressedRespone = await promisify(brotliCompress)(JSON.stringify(chainResponse), {
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      });
      const filename = chain === 'total' ? 'lite/charts' : `lite/charts/${chain}`;
      await store(filename, compressedRespone, true);
    })
  );
};

export default wrapScheduledLambda(handler);
