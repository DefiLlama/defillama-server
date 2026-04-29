import { getChainIdFromDisplayName } from "../utils/normalizeChain";
import { initPG, storeHistoricalPG, storeMetadataPG,  } from "./db";
import { protocolIdMap } from "./constants";
import { RWA_KEY_MAP } from "./metadataConstants";
import { sendMessage } from "../utils/discord";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";

const inverseProtocolIdMap: { [name: string]: string } = Object.entries(protocolIdMap).reduce(
  (acc: { [name: string]: string }, [id, name]: [string, string]) => {
    acc[name] = id;
    return acc;
  },
  {}
);
export interface AtvlInsert {
  timestamp: number;
  id: string;
  defiactivetvl: string;
  mcap: string;
  activemcap: string;
  totalsupply: string;
  aggregatedefiactivetvl: number;
  aggregatemcap: number;
  aggregatedactivemcap: number;
}

export interface AtvlPerIdData {
  defiActiveTvl: { [chain: string]: { [name: string]: string } };
  onChainMcap: { [chain: string]: string };
  activeMcap: { [chain: string]: string };
  totalSupply?: { [chain: string]: number | string };
}

// Pure transform: atvl per-id output → DB insert row. Exported for unit tests so they can assert on the
// exact JSON / aggregate values that would be written to Postgres without exercising the DB.
export function buildAtvlInsert(id: string, perId: AtvlPerIdData, timestamp: number): AtvlInsert {
  const { defiActiveTvl, onChainMcap, activeMcap, totalSupply } = perId;

  const defiactivetvl: { [chain: string]: { [id: string]: string } } = {};
  let aggregatedefiactivetvl = 0;
  Object.keys(defiActiveTvl ?? {}).forEach((chain) => {
    const chainSlug = getChainIdFromDisplayName(chain);
    defiactivetvl[chainSlug] = {};
    Object.keys(defiActiveTvl[chain]).forEach((name) => {
      const protocolId = inverseProtocolIdMap[name];
      aggregatedefiactivetvl += Number(defiActiveTvl[chain][name]);
      defiactivetvl[chainSlug][protocolId] = defiActiveTvl[chain][name];
    });
  });

  const mcap: { [chain: string]: string } = {};
  let aggregatemcap = 0;
  Object.keys(onChainMcap ?? {}).forEach((chain) => {
    const chainSlug = getChainIdFromDisplayName(chain);
    mcap[chainSlug] = onChainMcap[chain];
    aggregatemcap += Number(onChainMcap[chain]);
  });

  const activemcap: { [chain: string]: string } = {};
  let aggregatedactivemcap = 0;
  Object.keys(activeMcap ?? {}).forEach((chain) => {
    const chainSlug = getChainIdFromDisplayName(chain);
    activemcap[chainSlug] = activeMcap[chain];
    aggregatedactivemcap += Number(activeMcap[chain]);
  });

  const totalsupply: { [chain: string]: string } = {};
  Object.keys(totalSupply ?? {}).forEach((chain) => {
    const chainSlug = getChainIdFromDisplayName(chain);
    totalsupply[chainSlug] = String(totalSupply![chain]);
  });

  return {
    timestamp,
    id,
    defiactivetvl: JSON.stringify(defiactivetvl),
    mcap: JSON.stringify(mcap),
    activemcap: JSON.stringify(activemcap),
    totalsupply: JSON.stringify(totalsupply),
    aggregatedefiactivetvl,
    aggregatemcap,
    aggregatedactivemcap,
  };
}

// Store historical data
export async function storeHistorical(res: { data: { [id: string]: AtvlPerIdData }, timestamp: number }): Promise<void> {
  const { data, timestamp } = res;
  if (Object.keys(data).length == 0) return;

  const inserts: AtvlInsert[] = [];
  await runInPromisePool({
    items: Object.keys(data),
    concurrency: 5,
    processor: async (id: any) => {
      const insert = buildAtvlInsert(id, data[id], timestamp);
      if (
        isNaN(insert.timestamp) || isNaN(Number(insert.id)) ||
        isNaN(insert.aggregatedefiactivetvl) || isNaN(insert.aggregatemcap) || isNaN(insert.aggregatedactivemcap)
      ) {
        await sendMessage(`ERROR ON ID ${id}`, process.env.RWA_WEBHOOK!, false);
        throw new Error(`ERROR ON ID ${id}`);
      }
      inserts.push(insert);
    },
  });

  await initPG();
  await storeHistoricalPG(inserts, timestamp);
}

// Store metadata
export async function storeMetadata(res: { data: { [id: string]: { [key: string]: any } } }): Promise<void> {
  const { data } = res;
  if (Object.keys(data).length == 0) return;

  const inserts = Object.keys(data).map((id: any) => {
    const { [RWA_KEY_MAP.activeMcap]: activeMcap, [RWA_KEY_MAP.onChain]: onChain, [RWA_KEY_MAP.defiActive]: defiActive, ...rest } = data[id];
    return { id, data: JSON.stringify(rest) };
  });
  await initPG();
  await storeMetadataPG(inserts);
}
