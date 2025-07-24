import { getCachedHistoricalTvlForAllProtocols, getHistoricalTvlForAllProtocols, IProtocol } from "./storeGetCharts";
import { successResponse, wrap, IResponse } from "./utils/shared";
import { extraSections } from "./utils/normalizeChain";
import { DAY, getClosestDayStartTimestamp } from "./utils/date";
import { _InternalProtocolMetadata, _InternalProtocolMetadataMap } from "./protocols/data";
import { hiddenCategoriesFromUISet } from "./utils/excludeProtocols";

interface SumDailyTvls {
  [timestamp: number]: {
    [category: string]: {
      [key: string]: number;
    };
  };
}

interface IProtocolsByCategory {
  [category: string]: Set<string>;
}

interface Item {
  [key: string]: number;
}

interface IProtocolTvl {
  protocol: IProtocol
  historicalTvl: Item[]
  lastTimestamp: number
}

function sum(
  total: SumDailyTvls,
  category: string,
  time: number,
  item: Item = {},
  categoryProtocols: IProtocolsByCategory,
  protocol: IProtocol,
  { isDoublecounted, isLiquidStaking }: _InternalProtocolMetadata
) {
  if (total[time] == null) {
    total[time] = {};
  }
  const data = {...(total[time][category] || {})};

  for (const section in item) {
    if (section === "tvl" || extraSections.includes(section)) {
      data[section] = (data[section] || 0) + item[section];
    }
  }

  if (isDoublecounted) {
    data.doublecounted = (data.doublecounted || 0) + item.tvl;
  }

  if (isLiquidStaking) {
    data.liquidstaking = (data.liquidstaking || 0) + item.tvl;
  }

  if (isLiquidStaking && isDoublecounted) {
    data.dcAndLsOverlap = (data.dcAndLsOverlap || 0) + item.tvl;
  }

  total[time][category] = data;

  if (categoryProtocols[category] == null) {
    categoryProtocols[category] = new Set();
  }
  categoryProtocols[category].add(protocol.name);
}

export async function getCategoriesInternal({ ...options }: any = {}) {

  const sumDailyTvls = {} as SumDailyTvls;
  const categoryProtocols = {} as IProtocolsByCategory;

  let historicalProtocolTvlsData: Awaited<ReturnType<typeof getHistoricalTvlForAllProtocols>>
  if (options.isApi2CronProcess) {
    historicalProtocolTvlsData = await getHistoricalTvlForAllProtocols(false, false, options);
  } else {
    historicalProtocolTvlsData = await getCachedHistoricalTvlForAllProtocols(false, false)
  }

  const { historicalProtocolTvls, } = historicalProtocolTvlsData

  function addToChart(protocolTvl: IProtocolTvl, item: Item, timestamp: number, protocolMetadata: _InternalProtocolMetadata) {
    try {
      sum(sumDailyTvls, protocolMetadata.category, timestamp, item, categoryProtocols, protocolTvl.protocol, protocolMetadata);
    } catch (error) {
      console.log(protocolTvl.protocol.name, error);
    }
  }

  historicalProtocolTvls.forEach((protocolTvl) => {
    if (!protocolTvl) return;

    const protocolMetadata: _InternalProtocolMetadata = _InternalProtocolMetadataMap[protocolTvl.protocol.id];

    if (!protocolMetadata) {
      console.warn(`No metadata found for protocol ${protocolTvl.protocol.name} (${protocolTvl.protocol.id})`);
      return;
    }

    if (hiddenCategoriesFromUISet.has(protocolMetadata.category)) {
      return;
    }

    let previousItem: Item = { SK: 0 }
    protocolTvl.historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      const previousTimestamp = getClosestDayStartTimestamp(previousItem.SK)
      const daysDifference = previousTimestamp ? (timestamp - previousTimestamp) / DAY : 0

      for (let i = 1; i < daysDifference; i++) {
        const interpolatedItem: Item = {}
        Object.keys(previousItem).forEach((key) => {
          if (['SK', 'PK'].includes(key)) {
            interpolatedItem[key] = previousItem[key]
            return
          }

          if (!item[key]) return

          interpolatedItem[key] = previousItem[key] + (item[key] - previousItem[key]) * i / daysDifference
        })

        addToChart(protocolTvl, interpolatedItem, previousTimestamp + DAY * i, protocolMetadata)
      }

      addToChart(protocolTvl, item, timestamp, protocolMetadata)
      previousItem = item
    })
  })

  return {
    chart: sumDailyTvls,
    categories: Object.fromEntries(Object.entries(categoryProtocols).map((c) => [c[0], Array.from(c[1])])),
  }
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  return successResponse(await getCategoriesInternal(), 10 * 60); // 10 mins cache
};

export default wrap(handler);
