import { IProtocol, processProtocols, TvlItem } from "./storeGetCharts";
import { successResponse, wrap, IResponse } from "./utils/shared";
import { extraSections, getChainDisplayName } from "./utils/normalizeChain";

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

interface IChainByOracle {
  [oracle: string]: Record<string, number>;
}

function sum(
  totalByChain: SumDailyTvls,
  total: SumDailyTvls,
  oracle: string,
  time: number,
  item: Item = {},
  oracleProtocols: OracleProtocols,
  protocol: IProtocol,
  chain: string | null,
  oracleTvlByChain: IChainByOracle
) {
  if (!totalByChain[time]) {
    totalByChain[time] = {};
  }
  if (!total[time]) {
    total[time] = {};
  }
  if (!oracleTvlByChain[oracle]) {
    oracleTvlByChain[oracle] = {};
  }

  const dataByChain = totalByChain[time][oracle] ?? {};
  const data = total[time][oracle] ?? {};

  for (const section in item) {
    const sectionSplit = section.split("-");
    if (
      !["SK", "PK", "tvlPrev1Week", "tvlPrev1Day", "tvlPrev1Hour", "tvl"].includes(sectionSplit[0]) &&
      (chain ? sectionSplit[0] === chain : true)
    ) {
      const sectionKey = `${getChainDisplayName(sectionSplit[0], true)}${sectionSplit[1] ? `-${sectionSplit[1]}` : ""}`;

      dataByChain[sectionKey] = (dataByChain[sectionKey] ?? 0) + item[section];

      if (!sectionSplit[1]) {
        if (extraSections.includes(section)) {
          data[section] = (data[section] ?? 0) + item[section];
        } else {
          oracleTvlByChain[oracle][getChainDisplayName(section, true)] =
            (oracleTvlByChain[oracle][getChainDisplayName(section, true)] ?? 0) + item[section];
          data.tvl = (data.tvl ?? 0) + item[section];
        }
      }
    }
  }

  totalByChain[time][oracle] = dataByChain;
  total[time][oracle] = data;

  if (!oracleProtocols[oracle]) {
    oracleProtocols[oracle] = new Set();
  }
  oracleProtocols[oracle].add(protocol.name);
}

export async function getOraclesInternal({ ...options }: any = {}) {
  const sumDailyTvls = {} as SumDailyTvls;
  const sumDailyTvlsByChain = {} as SumDailyTvls;
  const oracleProtocols = {} as OracleProtocols;
  const oracleTvlByChain = {} as IChainByOracle;

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
      try {
        if (protocol.oraclesByChain) {
          for (const chain in protocol.oraclesByChain) {
            for (const oracle of protocol.oraclesByChain[chain]) {
              sum(
                sumDailyTvlsByChain,
                sumDailyTvls,
                oracle,
                timestamp,
                item,
                oracleProtocols,
                protocol,
                chain,
                oracleTvlByChain
              );
            }
          }
        } else if (protocol.oracles) {
          for (const oracle of protocol.oracles) {
            sum(
              sumDailyTvlsByChain,
              sumDailyTvls,
              oracle,
              timestamp,
              item,
              oracleProtocols,
              protocol,
              null,
              oracleTvlByChain
            );
          }
        }
      } catch (error) {
        console.log(protocol.name, error);
      }
    },
    { includeBridge: false, ...options }
  );

  const chainsByOracle: Record<string, Array<string>> = {};
  for (const oracle in oracleTvlByChain) {
    chainsByOracle[oracle] = Object.entries(oracleTvlByChain[oracle])
      .sort((a, b) => b[1] - a[1])
      .map((item) => item[0]);
  }

  return {
    chart: sumDailyTvls,
    chainChart: sumDailyTvlsByChain,
    oracles: Object.fromEntries(Object.entries(oracleProtocols).map((c) => [c[0], Array.from(c[1])])),
    chainsByOracle,
  };
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  return successResponse(await getOraclesInternal(), 10 * 60); // 10 mins cache
};

handler({} as any).catch(console.log);

export default wrap(handler);
