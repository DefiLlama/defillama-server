import protocols, { Protocol } from './protocols/data';
import { getHistoricalValues } from './utils/shared/dynamodb';
import { dailyTvl, getLastRecord, hourlyTvl } from './utils/getLastRecord';
import { DAY, getClosestDayStartTimestamp, secondsInHour } from './utils/date';
import { getChainDisplayName, chainCoingeckoIds, transformNewChainName, extraSections, isDoubleCounted } from './utils/normalizeChain';
import { IResponse, successResponse, wrap } from './utils/shared';
import { craftProtocolsResponse } from './getProtocols';
import { getProtocolTvl, ProtocolTvls } from './utils/getProtocolTvl';
import { importAdapter } from './utils/imports/importAdapter';

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
        importAdapter(protocol)
      ]);
      if (historicalTvl.length < 1) {
        return undefined;
      }

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

const handler1 = async (_event: any) => {
  // storeGetCharts
  const sumDailyTvls = {} as SumDailyTvls;

  await processProtocols(async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
    sum(sumDailyTvls, 'total', 'tvl', timestamp, item.tvl);
    if (protocol?.doublecounted) {
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
      if (protocol?.doublecounted) {
        sum(sumDailyTvls, chainName, 'doublecounted', timestamp, item.tvl);
      }
    }
  });

  // storeGetProtocols
  const protocols = await craftProtocolsResponse(true);
  const trimmedResponse = await Promise.all(
    protocols.map(async (protocol) => {
      const protocolTvls: ProtocolTvls = await getProtocolTvl(protocol, true);
      return {
        category: protocol.category,
        chains: protocol.chains,
        oracles: protocol.oracles,
        forkedFrom: protocol.forkedFrom,
        listedAt: protocol.listedAt,
        mcap: protocol.mcap,
        name: protocol.name,
        symbol: protocol.symbol,
        tvl: protocolTvls.tvl,
        tvlPrevDay: protocolTvls.tvlPrevDay,
        tvlPrevWeek: protocolTvls.tvlPrevWeek,
        tvlPrevMonth: protocolTvls.tvlPrevMonth,
        chainTvls: protocolTvls.chainTvls,
      };
    })
  );
  

  // Filter data based on chain you want to test
  // storeGetCharts response filter
  const data: any = {};

  Object.entries(sumDailyTvls['Fantom']).map(([ch, ts]) => {
    const final = Object.entries(ts);
    data[ch] = final[final.length - 1];
  });

  // storeGetProtocols response filter
  const list = trimmedResponse
    .filter((p) => p.category !== 'Chain')
    .filter((p) => {
      return p.chains.includes('Fantom') && p.category !== 'Bridge';
    });
  
  const pTotals: any = {};

  list.forEach((item) => {
    Object.entries(item.chainTvls).map(([chain, values]) => {
      if (chain.includes('Fantom')) {
        pTotals[chain] = (pTotals[chain] || 0) + values.tvl;
      }
    });
  });

  return { chartTotals: data, protocolTotals: pTotals };
};

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  let response = await handler1(event);

  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);