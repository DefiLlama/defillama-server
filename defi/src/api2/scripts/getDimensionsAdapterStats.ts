import loadAdaptorsData from "../../adaptors/data";
import { ADAPTER_TYPES } from "../../adaptors/data/types";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";


let data: any

export async function getDimensionsAdapterStats() {
  if (!data) data = _call()
  return data;
}

async function _call() {
  const stats: any = {}
  await Promise.all(ADAPTER_TYPES.map(getStats))
  async function getStats(adapterType: AdapterType) {
    const adaptorsData = await loadAdaptorsData(adapterType);
    const { importModule, protocolAdaptors } = adaptorsData

    const stat: any = {
      total: protocolAdaptors.length,
      v1Count: 0,
      v2Count: 0,
      dead: 0,
      runCurrTime: 0,
    }
    stats[adapterType] = stat

    for (const protocol of protocolAdaptors) {
      try {
        const module = await importModule(protocol.module)
        switch (module.version) {
          case 1: stat.v1Count = stat.v1Count + 1; break;
          case 2: stat.v2Count = stat.v2Count + 1; break;
          default:
            stat.unknownVersion = (stat.unknownVersion || 0) + 1;
            console.warn(`Unknown version ${module.version} for protocol ${protocol.name} in adapter type ${adapterType}`)
        }

        stat.dead = stat.dead + (module.deadFrom ? 1 : 0);
        stat.runCurrTime = stat.runCurrTime + (module.runAtCurrTime ? 1 : 0);
        if (!module.hasOwnProperty('runAtCurrTime')) {
          console.warn(`Protocol ${protocol.id} in adapter type ${adapterType} does not have runAtCurrTime property`);
        }
      } catch (e: any) {
        console.error(`Error importing module for protocol ${protocol.name} in adapter type ${adapterType}`, (e?.message || e));
        stat.errorCount = (stat.errorCount || 0) + 1;
        continue;
      }
    }
  }
  return stats
}

if (!process.env.IS_NOT_SCRIPT_MODE)
  getDimensionsAdapterStats().then(console.table).catch(console.error).then(() => {
    console.log("Done");
    process.exit(0);
  })