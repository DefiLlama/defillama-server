import { IProtocol, processProtocols, TvlItem } from "./storeGetCharts";
import { successResponse, wrap, IResponse } from "./utils/shared";
import { extraSections, getChainDisplayName } from "./utils/normalizeChain";
import { chainsByOracle } from "./constants/chainsByOracle";

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
  chain: string | null
) {
  if (!totalByChain[time]) {
    totalByChain[time] = {};
  }
  if (!total[time]) {
    total[time] = {};
  }

  const dataByChain = totalByChain[time][oracle] ?? {};
  const data = total[time][oracle] ?? {};

  const isOldTvlRecord = Object.keys(item).filter((item) => !["PK", "SK", "tvl"].includes(item)).length === 0;
  for (const section in item) {
    const sectionSplit = (isOldTvlRecord && section === "tvl" ? protocol.chain : section).split("-");

    if (
      ![
        "SK",
        "PK",
        "tvl",
        "tvlPrev1Week",
        "tvlPrev1Day",
        "tvlPrev1Hour",
        "Stake",
        "oec",
        "treasury_bsc",
        "Earn",
        "eth",
        "WooPP",
        "bscStaking",
        "avaxStaking",
        "pool3",
        "masterchef",
        "staking_eth",
        "staking_bsc",
      ].includes(sectionSplit[0]) &&
      (chain ? sectionSplit[0] === chain : true)
    ) {
      const sectionKey = `${getChainDisplayName(sectionSplit[0], true)}${sectionSplit[1] ? `-${sectionSplit[1]}` : ""}`;

      dataByChain[sectionKey] = (dataByChain[sectionKey] ?? 0) + item[section];

      if (!sectionSplit[1]) {
        if (extraSections.includes(section)) {
          data[section] = (data[section] ?? 0) + item[section];
        } else {
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

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
      try {
        if (protocol.oraclesByChain) {
          for (const chain in protocol.oraclesByChain) {
            for (const oracle of protocol.oraclesByChain[chain]) {
              sum(sumDailyTvlsByChain, sumDailyTvls, oracle, timestamp, item, oracleProtocols, protocol, chain);
            }
          }
        } else if (protocol.oracles) {
          for (const oracle of protocol.oracles) {
            sum(sumDailyTvlsByChain, sumDailyTvls, oracle, timestamp, item, oracleProtocols, protocol, null);
          }
        }
      } catch (error) {
        console.log(protocol.name, error);
      }
    },
    { includeBridge: false, ...options }
  );

  const oracleTvlByChain = {} as IChainByOracle;
  const latestTvlByChainByOracle = Object.entries(sumDailyTvlsByChain).slice(-1)[0][1];
  for (const oracle in latestTvlByChainByOracle) {
    const chains = Object.fromEntries(
      Object.entries(latestTvlByChainByOracle[oracle] as [string, number])
        .filter((c) => !c[0].includes("-") && !extraSections.includes(c[0]))
        .sort((a, b) => (b[1] as number) - (a[1] as number))
    );

    oracleTvlByChain[oracle] = chains as Record<string, number>;
  }

  const finalChainsByOracle: Record<string, Array<string>> = {};
  for (const oracle in oracleTvlByChain) {
    const documentedChainsTvl = (chainsByOracle[oracle] ?? []).sort(
      (a, b) => (oracleTvlByChain[oracle][b] ?? 0) - (oracleTvlByChain[oracle][a] ?? 0)
    );

    const allChainsWithTvl = Object.entries(oracleTvlByChain[oracle])
      .sort((a, b) => b[1] - a[1])
      .map((item) => item[0]);

    finalChainsByOracle[oracle] = [...new Set(documentedChainsTvl.length > 0 ? documentedChainsTvl : allChainsWithTvl)];
  }

  return {
    chart: sumDailyTvls,
    chainChart: sumDailyTvlsByChain,
    oracles: Object.fromEntries(Object.entries(oracleProtocols).map((c) => [c[0], Array.from(c[1])])),
    chainsByOracle: finalChainsByOracle,
  };
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  return successResponse(await getOraclesInternal(), 10 * 60); // 10 mins cache
};

export default wrap(handler);
