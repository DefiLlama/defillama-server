import { getLatestProtocolItems, initializeTVLCacheDB } from "../api2/db";
import protocols from "../protocols/data";
import treasuries from "../protocols/treasury";
import { dailyTvl, hourlyTvl } from "./getLastRecord";
import { importAdapter } from "./imports/importAdapter";

type InfoProtocol = {
  time: number,
  tvl: number
} | null;

export async function getInconsistentTvl(getLatestTvl: (protocol: any) => Promise<any | undefined>) {
  const inconsistent = [] as [string, InfoProtocol][];
  const allProtocols = protocols.concat(treasuries);

  await Promise.all(
    allProtocols.map(async (protocol) => {
      if (protocol.rugged === true || protocol.module === "dummy.js") 
        return;
      
      const item = await getLatestTvl(protocol);
      if (!item) 
        return;
      
      let module;
      try {
        module = await importAdapter(protocol);
      } catch {
        return;
      }
      if (module.deadFrom) {
        return;
      }
      if (item.tvl < 0) {
        inconsistent.push([protocol.name, { time: item.SK, tvl: item.tvl }]);
      }
    })
  );

  return inconsistent;
}

export async function findInconsistentTvlPG() {
  await initializeTVLCacheDB();
  const latestProtocolItems = await getLatestProtocolItems(hourlyTvl, {
    filterLast24Hours: true,
  });
  const latestProtocolItemsDaily = await getLatestProtocolItems(dailyTvl);
  const latestProtocolItemsMap: Record<string, any> = {};
  latestProtocolItems.forEach((data: any) => {
    latestProtocolItemsMap[data.id] = data.data;
  });
  latestProtocolItemsDaily.forEach((data: any) => {
    if (!latestProtocolItemsMap[data.id]) {
      latestProtocolItemsMap[data.id] = data.data;
    }
  });
  return getInconsistentTvl(async (protocol: any) => {
    return latestProtocolItemsMap[protocol.id];
  });
}

export default async function findInconsistentTvl() {
  const inconsistent = await findInconsistentTvlPG();
  return inconsistent;
}

findInconsistentTvl().then(r => console.log(r));
