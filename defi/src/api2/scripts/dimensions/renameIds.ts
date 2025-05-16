// import { Op, col, fn } from "sequelize";
import { init } from "../../../adaptors/db-utils/db2";
import { Tables } from "../../db/tables";
import { ADAPTER_TYPES } from "../../../adaptors/handlers/triggerStoreAdaptorData";
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import loadAdaptorsData from "../../../adaptors/data"

async function fetchChainIds() {


  await init();
  for (const adapterType of ADAPTER_TYPES) {
    await fixChainIdsByType(adapterType)
  }

  async function fixChainIdsByType(adapterType: AdapterType) {

    const { protocolMap: dimensionProtocolMap } = loadAdaptorsData(adapterType)
    const chainListings = Object.values(dimensionProtocolMap).filter((protocol: any) => protocol.protocolType === ProtocolType.CHAIN)
    if (chainListings.length) {
      console.log(adapterType, Object.keys(dimensionProtocolMap).length, chainListings.length)
      console.table(chainListings.map(({ id, id2, displayName, }: any) => ({ idOld: `chain#${id}`, id2, displayName, })))
    }
    for (const chainItem of chainListings) {
      const oldId = `chain#${chainItem.id}`;
      const newId = chainItem.id2;
      console.log('Processing:', chainItem.displayName, oldId, newId,);
      continue;
      try {
        const records = await Tables.DIMENSIONS_DATA.findAll({
          where: { id: oldId },
          raw: true,
        });
        if (records.length) {
          console.log(`Found ${records.length} records with id ${oldId}`);
          await Tables.DIMENSIONS_DATA.update(
            { id: newId },
            { where: { id: oldId } }
          );
          console.log(`Updated record id from ${oldId} to ${newId}`);
        } else {
          console.log(`No records found with id ${oldId}`);
        }
      } catch (err) {
        console.error(`Error updating records with id ${oldId}`, err);
      }
    }
  }

  /* try {
    let uniqueIds = await Tables.DIMENSIONS_DATA.findAll({
      attributes: [[fn('DISTINCT', col('id')), 'id']],
      where: { id: { [Op.like]: 'chain#%' } },
      raw: true,
    })
    uniqueIds = uniqueIds.map((id: any) => id.id);
    console.log('Unique IDs starting with "chain#":', uniqueIds, uniqueIds.length);
  } catch (err) {
    console.error('Error executing query', err);
  } finally {
  } */
}

fetchChainIds().then(() => {
  console.log('Connection closed');
})