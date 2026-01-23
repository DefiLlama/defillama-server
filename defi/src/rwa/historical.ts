import { getCurrentUnixTimestamp } from "../../src/utils/date";
import { getChainIdFromDisplayName } from "../utils/normalizeChain";
import { cache } from "@defillama/sdk";
import { initPG, fetchHistoricalPG, storeHistoricalPG, storeMetadataPG, fetchCurrentPG, fetchMetadataPG } from "./db";
import { keyMap, protocolIdMap } from "./constants";

const inverseProtocolIdMap: { [name: string]: string } = Object.entries(protocolIdMap).reduce(
  (acc: { [name: string]: string }, [id, name]: [string, string]) => {
    acc[name] = id;
    return acc;
  },
  {}
);
// Store historical data
export async function storeHistorical(res: { data: { [id: string]: { defiActiveTvl: { [chain: string]: { [name: string]: string } }, onChainMarketcap: { [chain: string]: string }, activeMcap: { [chain: string]: string } } }, timestamp: number }): Promise<void> {
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
// Fetch historical data
async function fetchHistorical(id: string): Promise<{ timestamp: number; onChainMarketcap: number; defiActiveTvl: number; activeMcap: number }[]> {
  const cachedData = await cache.readCache(`rwa/historical-${id}`);
  const timestamp = getCurrentUnixTimestamp();
  if (cachedData.timestamp > timestamp - 3600) return cachedData.data;

  await initPG();
  const { historical, current } = await fetchHistoricalPG(id);

  const data: { timestamp: number; onChainMarketcap: number; defiActiveTvl: number; activeMcap: number }[] = [];
  historical.sort((a: any, b: any) => a.timestamp - b.timestamp);
  [...historical, current].forEach((d: any) => {
    data.push({
      timestamp: d.timestamp,
      onChainMarketcap: d.aggregatemcap,
      defiActiveTvl: d.aggregatedefiactivetvl,
      activeMcap: d.aggregatedactivemcap,
    });
  });

  await cache.writeCache(`rwa/historical-${id}`, { data, timestamp: getCurrentUnixTimestamp() });

  return data;
}
// Store metadata
export async function storeMetadata(res: { data: { [id: string]: { [key: string]: any } } }): Promise<void> {
  const { data } = res;
  if (Object.keys(data).length == 0) return;

  const inserts = Object.keys(data).map((id: any) => {
    const { [keyMap.activeMcap]: activeMcap, [keyMap.onChain]: onChain, [keyMap.defiActive]: defiActive, ...rest } = data[id];
    return { id, data: JSON.stringify(rest) };
  });
  await initPG();
  await storeMetadataPG(inserts);
}
// Fetch historical data for a given protocol
export async function rwaChart(name: string): Promise<{ data: { timestamp: number; onChainMarketcap: number; defiActiveTvl: number; activeMcap: number }[] }> {
  await initPG();
  const idMap = await cache.readCache("rwa/id-map");
  const id = JSON.parse(idMap)[name];
  if (!id) throw new Error(`Protocol ${name} not found`);
  const data = await fetchHistorical(id);
  return { data };
}
// Fetch current data
export async function rwaCurrent(): Promise<{ data: any[], timestamp: number }> {
  await initPG();
  const [current, metadata] = await Promise.all([fetchCurrentPG(), fetchMetadataPG()]);

  const currentMap: { [id: string]: any } = {};
  current.forEach((c: any) => {
    currentMap[c.id] = c;
  });

  const data: { [id: string]: any }[] = [];
  let timestamp = 0;

  metadata.forEach((m: any) => {
    const idCurrent = currentMap[m.id];
    if (!idCurrent) return;
    const dataJson = JSON.parse(m.data);

    Object.keys(idCurrent).forEach((key: string) => {
      if (key == 'timestamp' && idCurrent[key] > timestamp) timestamp = idCurrent[key];
      else if (key == 'id') return;
      else dataJson[key] = JSON.parse(idCurrent[key]);
    });

    data.push(dataJson);
  });

  return { data, timestamp }
}