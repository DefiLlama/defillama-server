import { getChainIdFromDisplayName } from "../utils/normalizeChain";
import { initPG, storeHistoricalPG, storeMetadataPG,  } from "./db";
import { keyMap, protocolIdMap } from "./constants";

const inverseProtocolIdMap: { [name: string]: string } = Object.entries(protocolIdMap).reduce(
  (acc: { [name: string]: string }, [id, name]: [string, string]) => {
    acc[name] = id;
    return acc;
  },
  {}
);
// Store historical data
export async function storeHistorical(res: { data: { [id: string]: { defiActiveTvl: { [chain: string]: { [name: string]: string } }, onChainMcap: { [chain: string]: string }, activeMcap: { [chain: string]: string } } }, timestamp: number }): Promise<void> {
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
    const { defiActiveTvl, onChainMcap, activeMcap } = data[id];

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
    Object.keys(onChainMcap ?? {}).map((chain: string) => {
      const chainSlug = getChainIdFromDisplayName(chain);
      mcap[chainSlug] = onChainMcap[chain];
      aggregatemcap += Number(onChainMcap[chain]);
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
