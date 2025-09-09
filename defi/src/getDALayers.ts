import { IProtocol, processProtocols, TvlItem } from "./storeGetCharts";
import { successResponse, wrap, IResponse } from "./utils/shared";
import { getChainDisplayName, chainCoingeckoIds } from "./utils/normalizeChain";
import { _InternalProtocolMetadata } from "./protocols/data";
import { APIGatewayEvent } from "aws-lambda";

interface SumDailyTvls {
  [timestamp: number]: {
    [daProvider: string]: {
      [key: string]: number;
    };
  };
}

interface DAByChain {
  [timestamp: number]: {
    [daProvider: string]: {
      [chain: string]: number;
    };
  };
}

interface Item {
  [key: string]: number;
}

interface IChainByDA {
  [daProvider: string]: Record<string, number>;
}

function sum(
  totalByChain: SumDailyTvls,
  total: SumDailyTvls,
  daProvider: string,
  time: number,
  item: Item = {},
  daByChainHistory: DAByChain,
  chain: string
) {
  if (!totalByChain[time]) totalByChain[time] = {};
  if (!total[time]) total[time] = {};
  if (!daByChainHistory[time]) daByChainHistory[time] = {};

  const dataByChain = totalByChain[time][daProvider] ?? {};
  const data = total[time][daProvider] ?? {};

  if (!daByChainHistory[time][daProvider]) {
    daByChainHistory[time][daProvider] = {};
  }

  // For DA, we only care about the specific chain's TVL
  const normalizedChain = getChainDisplayName(chain, true);
  const chainTvl = item[chain] || item[normalizedChain] || 0;

  if (chainTvl > 0) {
    dataByChain[normalizedChain] = (dataByChain[normalizedChain] ?? 0) + chainTvl;
    data.tvs = (data.tvs ?? 0) + chainTvl;

    daByChainHistory[time][daProvider][normalizedChain] =
      (daByChainHistory[time][daProvider][normalizedChain] ?? 0) + chainTvl;
  }

  totalByChain[time][daProvider] = dataByChain;
  total[time][daProvider] = data;
}

export async function getDALayersInternal({ ...options }: any = {}) {
  const sumDailyTvls = {} as SumDailyTvls;
  const sumDailyTvlsByChain = {} as SumDailyTvls;
  const daByChain = {} as DAByChain;

  // filter chains that have DA providers
  const chainsByDA: { [daProvider: string]: string[] } = {};
  Object.entries(chainCoingeckoIds).forEach(([chainName, chainData]) => {
    if (chainData.parent && chainData.parent.da) {
      const daProvider = chainData.parent.da;
      if (!chainsByDA[daProvider]) {
        chainsByDA[daProvider] = [];
      }
      chainsByDA[daProvider].push(chainName);
    }
  });

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol, _protocolMetadata: _InternalProtocolMetadata) => {
      try {
        for (const [section, value] of Object.entries(item)) {
          if (typeof value !== 'number' || isNaN(value)) continue;

          const chainName = section.split('-')[0];
          const normalizedChain = getChainDisplayName(chainName, true);

          // Find which DA provider this chain uses
          for (const [daProvider, chains] of Object.entries(chainsByDA)) {
            const matchingChain = chains.find(chain =>
              getChainDisplayName(chain, true) === normalizedChain
            );

            if (matchingChain) {
              sum(sumDailyTvlsByChain, sumDailyTvls, daProvider, timestamp, item, daByChain, chainName);
              break;
            }
          }
        }
      } catch (error) {
        console.log(protocol.name, error);
      }
    },
    { includeBridge: false, ...options }
  );

  const timestamps = Object.keys(daByChain);
  const latestTimestamp = timestamps[timestamps.length - 1];

  const daTVS = latestTimestamp ? daByChain[parseInt(latestTimestamp)] : {};

  const daTvlByChain = {} as IChainByDA;
  const latestTvlByChainByDA = Object.entries(sumDailyTvlsByChain).slice(-1)[0]?.[1] || {};

  for (const daProvider in latestTvlByChainByDA) {
    const chains = Object.fromEntries(
      Object.entries(latestTvlByChainByDA[daProvider] as [string, number])
        .filter((c) => !c[0].includes("-"))
        .sort((a, b) => (b[1] as number) - (a[1] as number))
    );

    daTvlByChain[daProvider] = chains as Record<string, number>;
  }

  const finalChainsByDA: Record<string, Array<string>> = {};
  for (const daProvider in daTvlByChain) {
    const allChainsWithTvl = Object.entries(daTvlByChain[daProvider])
      .sort((a, b) => b[1] - a[1])
      .map((item) => item[0]);

    finalChainsByDA[daProvider] = allChainsWithTvl;
  }

  return {
    chart: sumDailyTvls,
    chainChart: sumDailyTvlsByChain,
    daTVS: daTVS,
    daLayers: Object.keys(daTVS),
    chainsByDA: finalChainsByDA,
  };
}

const handler = async (_event: APIGatewayEvent): Promise<IResponse> => {
  return successResponse(await getDALayersInternal(), 10 * 60); // 10 mins cache
};

export default wrap(handler);