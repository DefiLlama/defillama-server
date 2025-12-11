import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { fetchHistoricalFromDB, fetchColumns } from "../storeToDb";
import { getChainIdFromDisplayName } from "../../src/utils/normalizeChain";
import chains from "../../DefiLlama-Adapters/projects/helper/chains.json";
import { protocolBridgeIds } from "../constants";
import { storeHistoricalToDB } from "../v2/storeToDb";

const concurrency: number = 1;
const allNewData: { [timestamp: number]: any } = {};

async function main() {
  const items: string[] = await fetchColumns();

  await runInPromisePool({
    items,
    concurrency,
    processor: processChainKey,
  });

  async function processChainKey(slug: string) {
    if (slug == "timestamp") return;
    const chainId = getChainIdFromDisplayName(slug);
    if (!chains.includes(chainId) && !Object.values(protocolBridgeIds).includes(chainId)) {
        console.log(`${chainId} not found in chains.json`);
        return;
    }
    const allOldData = await fetchHistoricalFromDB(slug);

    // raw data like { <CHAINSLUG>: {canonical: { breakdown: { <RAW>: number }, total: number }}}
    allOldData.forEach(({ timestamp, data }: any) => {
      if (timestamp > 1762509600) {
        return;
      }
      Object.keys(data).map((section: string) => {
        if (!allNewData[timestamp]) allNewData[timestamp] = {};
        if (!allNewData[timestamp][chainId]) allNewData[timestamp][chainId] = {};
        const sectionData = data[section];
        allNewData[timestamp][chainId][section] = { total: sectionData.total };
      });
    });
  }

  await runInPromisePool({
    items: Object.keys(allNewData),
    concurrency: 1,
    processor: (timestamp: number) => storeHistoricalToDB({ timestamp: Number(timestamp), value: allNewData[timestamp] })
  })

  return;
}

main(); // ts-node defi/l2/cli/migrateDataToV2.ts
	