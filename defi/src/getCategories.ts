import { getCachedHistoricalTvlForAllProtocols, getHistoricalTvlForAllProtocols, IProtocol } from "./storeGetCharts";
import { successResponse, wrap, IResponse } from "./utils/shared";
import { extraSections } from "./utils/normalizeChain";
import { getR2 } from "./utils/r2";
import { getClosestDayStartTimestamp } from "./utils/date";

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

function sum(
  total: SumDailyTvls,
  category: string,
  time: number,
  item: Item = {},
  categoryProtocols: IProtocolsByCategory,
  protocol: IProtocol
) {
  if (total[time] === undefined) {
    total[time] = {};
  }
  const data = total[time][category] || {};

  for (const i in item) {
    const section: string = i.includes("-") ? i.split("-")[1] : i;
    if (section === "tvl" || extraSections.includes(section)) {
      data[section] = (data[section] || 0) + item[section];
    }
  }

  if (protocol.doublecounted) {
    data.doublecounted = (data.doublecounted || 0) + item.tvl;
  }

  if (protocol.category?.toLowerCase() === "liquid staking") {
    data.liquidstaking = (data.liquidstaking || 0) + item.tvl;
  }

  if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
    data.dcAndLsOverlap = (data.dcAndLsOverlap || 0) + item.tvl;
  }

  total[time][category] = data;

  if (categoryProtocols[category] == undefined) {
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

  historicalProtocolTvls.forEach((protocolTvl) => {
    if (!protocolTvl) {
      return;
    }
    protocolTvl.historicalTvl.forEach((item) => {
      const timestamp = getClosestDayStartTimestamp(item.SK);
      try {
        let category = protocolTvl.protocol.category;
        if (category && category !== "CEX" && category !== 'Chain') {
          sum(sumDailyTvls, category, timestamp, item, categoryProtocols, protocolTvl.protocol);
          return;
        }
      } catch (error) {
        console.log(protocolTvl.protocol.name, error);
      }
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
