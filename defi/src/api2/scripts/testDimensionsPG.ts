// import { Op, col, fn } from "sequelize";
import { init } from "../../adaptors/db-utils/db2";
import { Tables } from "../db/tables";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../adaptors/data"

async function fetchChainIds() {


  await init();
  for (const adapterType of ADAPTER_TYPES) {
    await fixChainIdsByType(adapterType)
  }

  async function fixChainIdsByType(adapterType: AdapterType) {

    const { protocolAdaptors } = loadAdaptorsData(adapterType)
    
    console.log(protocolAdaptors.length, adapterType)
  }
}

fetchChainIds().then(() => {
  console.log('Connection closed');
})