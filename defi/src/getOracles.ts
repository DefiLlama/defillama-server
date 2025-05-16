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
        if (protocol.oraclesBreakdown && protocol.oraclesBreakdown.length > 0) {
          const activeOracles: Array<{ name: string, type: string, chain: string | null }> = [];

          for (const oracleEntry of protocol.oraclesBreakdown) {
            const oracleName = oracleEntry.name;
            const oracleType = oracleEntry.type;
            const generalStartDateStr = oracleEntry.startDate;
            const generalEndDateStr = oracleEntry.endDate;

            if (oracleEntry.chains && oracleEntry.chains.length > 0) {
              for (const chainConfig of oracleEntry.chains) {
                const chainName = chainConfig.chain;
                const effectiveStartDateStr = chainConfig.startDate || generalStartDateStr;
                const effectiveEndDateStr = chainConfig.endDate || generalEndDateStr;

                let isActive = true;
                if (effectiveStartDateStr) {
                  const startDateTs = new Date(effectiveStartDateStr).getTime() / 1000;
                  if (timestamp < startDateTs) {
                    isActive = false;
                  }
                }
                if (isActive && effectiveEndDateStr) {
                  const endDateTs = new Date(effectiveEndDateStr).getTime() / 1000;
                  if (timestamp > endDateTs) {
                    isActive = false;
                  }
                }

                if (isActive) {
                  activeOracles.push({ name: oracleName, type: oracleType, chain: chainName });
                }
              }
            } else {
              let isActive = true;
              if (generalStartDateStr) {
                const startDateTs = new Date(generalStartDateStr).getTime() / 1000;
                if (timestamp < startDateTs) {
                  isActive = false;
                }
              }
              if (isActive && generalEndDateStr) {
                const endDateTs = new Date(generalEndDateStr).getTime() / 1000;
                if (timestamp > endDateTs) {
                  isActive = false;
                }
              }

              if (isActive) {
                activeOracles.push({ name: oracleName, type: oracleType, chain: null });
              }
            }
          }

          const primaryOracles = activeOracles.filter(o => o.type === 'Primary');
          const aggregatorOracles = activeOracles.filter(o => o.type === 'Aggregator');
          const numAggregators = aggregatorOracles.length;

          for (const o of primaryOracles) {
            sum(sumDailyTvlsByChain, sumDailyTvls, o.name, timestamp, item, oracleProtocols, protocol, o.chain);
          }
          if (numAggregators > 0) {
            const splitItem: Item = {};
            for (const key in item) {
              splitItem[key] = item[key] / numAggregators;
            }
            for (const o of aggregatorOracles) {
              sum(sumDailyTvlsByChain, sumDailyTvls, o.name, timestamp, splitItem, oracleProtocols, protocol, o.chain);
            }
          }
        } else if (protocol.oraclesByChain) {
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
