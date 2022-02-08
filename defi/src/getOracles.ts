import { processProtocols, TvlItem } from './storeGetCharts';
import { successResponse, wrap, IResponse } from './utils/shared';
import type { Protocol } from './protocols/data';

interface SumDailyTvls {
  [timestamp: number]: {
    [oracle: string]: number | undefined;
  };
}

interface OracleProtocols {
  [oracle: string]: Set<string>;
}

function sum(
  total: SumDailyTvls,
  oracle: string,
  time: number,
  tvl: number,
  oracleProtocols: OracleProtocols,
  protocol: string
) {
  if (total[time] === undefined) {
    total[time] = {};
  }
  total[time][oracle] = (total[time][oracle] ?? 0) + tvl;

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
        sum(sumDailyTvls, oracle, timestamp, item.tvl, oracleProtocols, protocol.name);
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
