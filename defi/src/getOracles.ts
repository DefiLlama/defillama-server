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

interface IChainsByOracle {
  [oracle: string]: Set<string>;
}

function sum(
  total: SumDailyTvls,
  oracle: string,
  time: number,
  item: Item = {},
  oracleProtocols: OracleProtocols,
  protocol: IProtocol,
  chain: string | null,
  includeChains = false,
  chainsByOracle: IChainsByOracle
) {
  if (total[time] === undefined) {
    total[time] = {};
  }
  const data = total[time][oracle] || {};

  const sectionToAdd = chain ?? "tvl";

  for (let section in item) {
    if (["SK", "TvlPrev1Hour", "TvlPrev1Day", "TvlPrev1Week"].includes(section)) return;
    if (chain !== null) {
      if (!section.startsWith(chain) && !includeChains) {
        continue;
      } else if (section.includes("-") && !includeChains) {
        section = section.split("-")[1];
      }
    }
    if (section === chain) {
      data.tvl = (data.tvl || 0) + item[section];
    } else if (section === sectionToAdd || extraSections.includes(section)) {
      data[section] = (data[section] || 0) + item[section];
    } else if (includeChains) {
      const sectionItem = section.split("-")[1];
      const sectionKey = `${getChainDisplayName(section.split("-")[0], true)}${sectionItem ? `-${sectionItem}` : ""}`;
      data[sectionKey] = (data[sectionKey] || 0) + item[section];
    }
  }

  if (protocol.doublecounted) {
    data.doublecounted = (data.doublecounted || 0) + item[sectionToAdd];
  }

  if (protocol.category?.toLowerCase() === "liquid staking") {
    data.liquidstaking = (data.liquidstaking || 0) + item[sectionToAdd];
  }

  if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
    data.dcAndLsOverlap = (data.dcAndLsOverlap || 0) + item[sectionToAdd];
  }

  total[time][oracle] = data;

  if (oracleProtocols[oracle] == undefined) {
    oracleProtocols[oracle] = new Set();
  }
  oracleProtocols[oracle].add(protocol.name);
  if (chainsByOracle[oracle] == undefined) {
    chainsByOracle[oracle] = new Set();
  }
  if (chain) {
    chainsByOracle[oracle].add(getChainDisplayName(chain, true));
  }
}

export async function getOraclesInternal({ ...options }: any = {}) {
  const sumDailyTvls = {} as SumDailyTvls;
  const sumDailyTvlsByChain = {} as SumDailyTvls;
  const oracleProtocols = {} as OracleProtocols;
  const chainsByOracle = {} as IChainsByOracle;

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
      try {
        if (protocol.oraclesByChain) {
          Object.entries(protocol.oraclesByChain).forEach(([chain, oracles]) => {
            oracles.forEach((oracle) => {
              sum(sumDailyTvls, oracle, timestamp, item, oracleProtocols, protocol, null, false, chainsByOracle);
              sum(sumDailyTvlsByChain, oracle, timestamp, item, oracleProtocols, protocol, chain, true, chainsByOracle);
            });
          });
        } else if (protocol.oracles) {
          protocol.oracles.forEach((oracle) => {
            sum(sumDailyTvls, oracle, timestamp, item, oracleProtocols, protocol, null, false, chainsByOracle);
            protocol.chains?.forEach((chain) => {
              sum(sumDailyTvlsByChain, oracle, timestamp, item, oracleProtocols, protocol, chain, true, chainsByOracle);
            });
          });
        }
      } catch (error) {
        console.log(protocol.name, error);
      }
    },
    { includeBridge: false, ...options }
  );
  return {
    chart: sumDailyTvls,
    chainChart: sumDailyTvlsByChain,
    oracles: Object.fromEntries(Object.entries(oracleProtocols).map((c) => [c[0], Array.from(c[1])])),
    chainsByOracle: Object.fromEntries(Object.entries(chainsByOracle).map((c) => [c[0], Array.from(c[1])])),
  };
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  return successResponse(await getOraclesInternal(), 10 * 60); // 10 mins cache
};

export default wrap(handler);
