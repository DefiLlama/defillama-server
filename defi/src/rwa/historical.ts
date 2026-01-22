import { getCurrentUnixTimestamp, getTimestampAtStartOfDay, secondsInDay } from "../../src/utils/date";
import { getChainIdFromDisplayName } from "../utils/normalizeChain";
import protocols from "../protocols/data";
import entities from "../protocols/entities";
import treasuries from "../protocols/treasury";
import { cache } from "@defillama/sdk";
import { initPG, fetchHistoricalPG, storeHistoricalPG, storeMetadataPG, fetchCurrentPG } from "./db";

const twoDaysAgo = getTimestampAtStartOfDay(getCurrentUnixTimestamp() - 2 * secondsInDay);

export const keyMap: { [value: string]: string } = {
  coingeckoId: "*Coingecko ID",
  onChain: "onChainMarketcap",
  defiActive: "defiActiveTvl",
  excluded: "*",
  assetName: "Name",
  id: "*RWA ID",
  projectId: "*projectID",
  excludedWallets: "*Holders to be Removed for Active Marketcap",
  activeMcap: "activeMcap",
  price: "price",
};


export const protocolIdMap: { [id: string]: string } = {};
export const categoryMap: { [category: string]: string } = {};
[...protocols, ...entities, ...treasuries].map((protocol: any) => {
  protocolIdMap[protocol.id] = protocol.name;
  categoryMap[protocol.id] = protocol.category;
});

const inverseProtocolIdMap: { [name: string]: string } = Object.entries(protocolIdMap).reduce(
  (acc: { [name: string]: string }, [id, name]: [string, string]) => {
    acc[name] = id;
    return acc;
  },
  {}
);

export async function storeHistorical(res: any) {
  const { data, timestamp } = res;
  if (Object.keys(data).length == 0) return;

  const inserts: {
    timestamp: number;
    id: string;
    defiactivetvl: string;
    mcap: string;
    activemcap: string;
    aggregatedefiactivetvl: number;
    aggregatemcap: number;
    aggregatedactivemcap: number;
  }[] = [];
  Object.keys(data).forEach((id: any) => {
    const { defiActiveTvl, onChainMarketcap, activeMcap } = data[id];

    // use chain slugs for defi active tvls and aggregate 
    const defiactivetvl: { [chain: string]: { [id: string]: string } } = {};
    let aggregatedefiactivetvl: number = 0;
    Object.keys(defiActiveTvl ?? {}).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      defiactivetvl[chainSlug] = {};
      Object.keys(defiActiveTvl[chain]).map((name: string) => {
        const id = inverseProtocolIdMap[name];
        aggregatedefiactivetvl += Number(defiActiveTvl[chain][name]);
        defiactivetvl[chainSlug][id] = defiActiveTvl[chain][name];
      });
    });

    // use chain slugs for mcaps and aggregate 
    const mcap: { [chain: string]: string } = {};
    let aggregatemcap: number = 0;
    Object.keys(onChainMarketcap ?? {}).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      mcap[chainSlug] = onChainMarketcap[chain];
      aggregatemcap += Number(onChainMarketcap[chain]);
    });

    // use chain slugs for active mcaps and aggregate 
    const activemcap: { [chain: string]: string } = {};
    let aggregatedactivemcap: number = 0;
    Object.keys(activeMcap ?? {}).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      activemcap[chainSlug] = activeMcap[chain];
      aggregatedactivemcap += Number(activeMcap[chain]);
    });

    if (isNaN(timestamp) || isNaN(id) || isNaN(aggregatedefiactivetvl) || isNaN(aggregatemcap) || isNaN(aggregatedactivemcap)) {
      console.log(`ERROR ON ID ${id}`)
    }

    inserts.push({
      timestamp,
      id,
      defiactivetvl: JSON.stringify(defiactivetvl),
      mcap: JSON.stringify(mcap),
      activemcap: JSON.stringify(activemcap),
      aggregatedefiactivetvl,
      aggregatemcap,
      aggregatedactivemcap,
    });
  });

  await initPG();
  await storeHistoricalPG(inserts, timestamp);
}

async function fetchHistorical(id: string) {
  const cachedData = await cache.readCache(`rwa/historical-${id}`);
  const timestamp = getCurrentUnixTimestamp();
  if (cachedData.timestamp > timestamp - 3600) return cachedData.data;

  await initPG();
  const data: any = await fetchHistoricalPG(id);

  const res: { timestamp: number; onChainMarketcap: number; defiActiveTvl: number; activeMcap: number }[] = [];
  data.sort((a: any, b: any) => a.timestamp - b.timestamp);
  data.forEach((d: any) => {
    const timestamp = d.timestamp < twoDaysAgo ? getTimestampAtStartOfDay(d.timestamp) : d.timestamp;

    res.push({
      timestamp,
      onChainMarketcap: d.aggregatemcap,
      defiActiveTvl: d.aggregatedefiactivetvl,
      activeMcap: d.aggregatedactivemcap,
    });
  });

  await cache.writeCache(`rwa/historical-${id}`, { data: res, timestamp: getCurrentUnixTimestamp() });

  return data;
}

export async function storeMetadata(res: any) {
  const { data } = res;
  if (Object.keys(data).length == 0) return;

  const inserts = Object.keys(data).map((id: any) => {
    const { [keyMap.activeMcap]: activeMcap, [keyMap.onChain]: onChain, [keyMap.defiActive]: defiActive, ...rest } = data[id];
    return { id, data: JSON.stringify(rest) };
  });
  await initPG();
  await storeMetadataPG(inserts);
}

export async function rwaChart(name: string) {
  const idMap = await cache.readCache("rwa/id-map");
  const id = idMap[name];
  if (!id) throw new Error(`Protocol ${name} not found`);
  const data = await fetchHistorical(id);
  return { data };
}

export async function rwaCurrent() {
  const data = await fetchCurrentPG();
  return { data }
}