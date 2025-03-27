// import { Op, col, fn } from "sequelize";
import { getAllDimensionsRecordsOnDate, init } from "../../adaptors/db-utils/db2";
import { Tables } from "../db/tables";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"

async function fetchChainIds() {

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yyyy = yesterday.getUTCFullYear();
  const mm = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getUTCDate()).padStart(2, '0');
  const yesterdayDateString = `${yyyy}-${mm}-${dd}`;

  console.log('yesterday:', yesterdayDateString);
  const currentHour = new Date().getUTCHours();
  console.log(`Current UTC hour: ${currentHour}`);

  await init();
  const dataTable: any = []
  for (const adapterType of ADAPTER_TYPES) {
    await fixChainIdsByType(adapterType)
  }

  console.table(dataTable);

  async function fixChainIdsByType(adapterType: AdapterType) {

    const { protocolAdaptors } = loadAdaptorsData(adapterType)
    const yesterdayData = await getAllDimensionsRecordsOnDate({ adapterType, date: yesterdayDateString });
    const yesterdayIdSet = new Set(yesterdayData.map((d: any) => d.id));
    dataTable.push({
      adapterType,
      protocolAdaptors: protocolAdaptors.length,
      yesterdayIdSet: yesterdayIdSet.size,
      missingYesterdayData: protocolAdaptors.filter((a: any) => !yesterdayIdSet.has(a.id)).length
    })
  }
}

fetchChainIds().then(() => {
  console.log('Connection closed');  
})