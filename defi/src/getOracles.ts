import { processProtocols, TvlItem } from './storeGetCharts';
import { successResponse, wrap, IResponse } from './utils/shared';
import type { Protocol } from './protocols/data';
import { extraSections } from './utils/normalizeChain';

interface SumDailyTvls {
  [timestamp: number]: {
    [oracle: string]: {
      [key: string]: number;
    };
  };
}

interface OracleProtocols {
  [oracle: string]: Set<string>;
}

interface Item {
  [key: string]: number;
}

function sum(
  total: SumDailyTvls,
  oracle: string,
  time: number,
  item: Item = {},
  oracleProtocols: OracleProtocols,
  protocol: string
) {
  if (total[time] === undefined) {
    total[time] = {};
  }

  const data = total[time][oracle] || {};

  for (const i in item) {
    const section: string = i.includes('-') ? i.split('-')[1] : i;
    if (section === 'tvl' || extraSections.includes(section)) {
      data[section] = (data[section] || 0) + item[section];
    }
  }

  total[time][oracle] = data;

  if (oracleProtocols[oracle] == undefined) {
    oracleProtocols[oracle] = new Set();
  }
  oracleProtocols[oracle].add(protocol);
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const sumDailyTvls = {} as SumDailyTvls;
  const oracleProtocols = {} as OracleProtocols;

  await processProtocols(async (timestamp: number, item: TvlItem, protocol: Protocol) => {
    let oracles = protocol.oracles;
    if (oracles) {
      oracles.forEach((oracle) => {
        sum(sumDailyTvls, oracle, timestamp, item, oracleProtocols, protocol.name);
      });

      return;
    }
  });

  return successResponse(
    {
      chart: sumDailyTvls,
      oracles: Object.fromEntries(Object.entries(oracleProtocols).map((c) => [c[0], Array.from(c[1])])),
    },
    10 * 60
  ); // 10 mins cache
};

export default wrap(handler);
