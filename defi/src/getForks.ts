import { IProtocol, processProtocols, TvlItem } from "./storeGetCharts";
import { successResponse, wrap, IResponse, cache20MinResponse } from "./utils/shared";
import { extraSections } from "./utils/normalizeChain";
import protocols, { _InternalProtocolMetadata } from "./protocols/data";
import parentProtocols from "./protocols/parentProtocols";

interface SumDailyTvls {
  [timestamp: number]: {
    [fork: string]: {
      [key: string]: number;
    };
  };
}

interface ForkedProtocols {
  [fork: string]: Set<string>;
}

interface Item {
  [key: string]: number;
}

function sum(
  total: SumDailyTvls,
  fork: string,
  time: number,
  item: Item = {},
  forkedProtocols: ForkedProtocols,
  protocol: IProtocol,
  { isDoublecounted, isLiquidStaking }: _InternalProtocolMetadata
) {
  if (total[time] === undefined) {
    total[time] = {};
  }

  const data = total[time][fork] || {};

  for (const i in item) {
    const section: string = i.includes("-") ? i.split("-")[1] : i;
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

  total[time][fork] = data;

  if (forkedProtocols[fork] == undefined) {
    forkedProtocols[fork] = new Set();
  }
  forkedProtocols[fork].add(protocol.name);
}

export async function getForksInternal({ ...options }: any = {}) {
  const sumDailyTvls = {} as SumDailyTvls;
  const forkedProtocols = {} as ForkedProtocols;

  const idToName: Record<string, string> = {};
  protocols.forEach((p: any) => {
    if (p.id && p.name) idToName[p.id] = p.name;
  });
  parentProtocols.forEach((parent: any) => {
    if (parent.id && parent.name) idToName[parent.id] = parent.name;
  });

  const protocolFilterFunction = (protocol: IProtocol, _protocolMetadata: _InternalProtocolMetadata) => {
    if (!Array.isArray(protocol?.forkedFromIds)) return false;
    return protocol.forkedFromIds.length > 0
  }

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol, protocolMetadata: _InternalProtocolMetadata) => {
      try {
        let forks: string[] | undefined = undefined;
        if (Array.isArray(protocol.forkedFromIds))
          forks = protocol.forkedFromIds.map((id) => idToName[id] || id);

        if (forks) {
          forks.forEach((fork) => {
            sum(sumDailyTvls, fork, timestamp, item, forkedProtocols, protocol, protocolMetadata);
          });
          return;
        } else {
          console.warn(`Protocol ${protocol.name} (${protocol.id}) has no forkedFromIds, skipping [this code should be unreachable, concerning]`);
        }
        
      } catch (error) {
        console.log(protocol.name, error);
      }
    },
    { includeBridge: false, protocolFilterFunction, ...options }
  );

  return {
    chart: sumDailyTvls,
    forks: Object.fromEntries(Object.entries(forkedProtocols).map((c) => [c[0], Array.from(c[1])])),
  }
}

const handler = async (_event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  return cache20MinResponse(await getForksInternal());
};

export default wrap(handler);
