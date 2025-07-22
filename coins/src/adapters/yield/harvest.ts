import fetch from "node-fetch";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { chainIdMap } from "../bridges/celer";

const margin = 60 * 60; // 1hr

export async function harvest(timestamp: number) {
  if (!process.env.HARVEST_KEY) throw new Error(`missing API key for harvest`);

  const res = await fetch(
    `https://api.harvest.finance/vaults?key=${process.env.HARVEST_KEY}`,
  ).then((r) => r.json());

  let t = timestamp == 0 ? getCurrentUnixTimestamp() : timestamp;
  const lastUpdated = Date.parse(res.updatedAt.apiData);
  if (t - lastUpdated / 1000 > margin)
    throw new Error(`Harvest response is too stale`);

  const writes: Write[] = [];
  Object.keys(res).map((deployment) => {
    if (deployment == "updatedAt") return;
    Object.values(res[deployment]).map((vault: any) => {
      const { chain, decimals, id, vaultAddress, usdPrice } = vault;

      addToDBWritesList(
        writes,
        chainIdMap[chain],
        vaultAddress,
        usdPrice,
        decimals,
        `harvest-${id}`,
        timestamp,
        "harvest",
        0.7,
      );
    });
  });

  return writes;
}
