import { IProtocol, processProtocols, TvlItem } from "./storeGetCharts";
import { successResponse, wrap, IResponse } from "./utils/shared";
import { extraSections } from "./utils/normalizeChain";

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

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const sumDailyTvls = {} as SumDailyTvls;
  const categoryProtocols = {} as IProtocolsByCategory;

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
      try {
        let category = protocol.category;
        if (category) {
          sum(sumDailyTvls, category, timestamp, item, categoryProtocols, protocol);
          return;
        }
      } catch (error) {
        console.log(protocol.name, error);
      }
    },
    { includeBridge: true }
  );

  return successResponse(
    {
      chart: sumDailyTvls,
      categories: Object.fromEntries(Object.entries(categoryProtocols).map((c) => [c[0], Array.from(c[1])])),
    },
    10 * 60
  ); // 10 mins cache
};

export default wrap(handler);
