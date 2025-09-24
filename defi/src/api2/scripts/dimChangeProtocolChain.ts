require("dotenv").config();
import { Op, Sequelize } from 'sequelize';
import { TABLES, initializeTVLCacheDB } from '../db/index'
import * as fs from 'fs'
import { id } from 'ethers';

async function changeProtocolChain({
  oldId, newId, oldChain, newChain,
}: { oldId: string, newId: string, oldChain: string, newChain: string }) {
  await initializeTVLCacheDB()

  const data = await TABLES.DIMENSIONS_DATA.findAll({
    where: {
      id: oldId,
      type: 'fees',
      // timeS: '2024-08-07'
    }
  })
  console.log('Found', data.length, 'records for protocol', oldId)
  const unixTS = Date.now()
  fs.writeFileSync(`changeProtocolChain_backup_${unixTS}.log`, JSON.stringify(data))

  let updateCount = 0

  for (const record of data) {
    let updateNeeded = oldId !== newId
    // Update chain name in each key of 'data' field
    if (record.dataValues.data && typeof record.dataValues.data === 'object') {
      if (record.dataValues.data.aggregated.dr) {
        delete record.dataValues.data.aggregated.dr
        updateNeeded = true
        updateCount++
      }
      /* 
     const aggData = Object.values(record.dataValues.data.aggregated) as any
  for (const dimItem of aggData) {
     if (dimItem.chains && dimItem.chains[oldChain] !== undefined) {
       updateNeeded = true
       dimItem.chains[newChain] = dimItem.chains[oldChain]
       delete dimItem.chains[oldChain]
     }
   } */
    }

    if (!updateNeeded) continue;

    // If you need to change the primary key, create a new record and delete the old one

    await upsertRecord();
    async function upsertRecord() {

      await record.destroy();
      const newRecord = await TABLES.DIMENSIONS_DATA.create({
        ...record.dataValues,
        id: newId,
        data: record.dataValues.data,
        updatedAt: new Date(),
      });
      console.log('replaced record:', newRecord.dataValues.timeS);
    }
  }
  console.log(`Updated ${updateCount} records`)
  await TABLES.DIMENSIONS_DATA.sequelize?.close()
}

function cleanUp() {
  console.log('done')
  process.exit(0)
}

changeProtocolChain({
  oldId: '6726',
  newId: '6726',
  oldChain: 'ethereum',
  newChain: 'paradex'
}).catch(console.error).then(cleanUp)



// createUpdateOIData().catch(console.error).then(cleanUp)


async function createUpdateOIData() {

  const whitelistedColSet = new Set(['doi', 'dsoi', 'dloi',])
  function cleanData(aggData: any) {
    Object.keys(aggData).forEach(key => {
      if (!whitelistedColSet.has(key)) {
        delete aggData[key]
      }
    })
    return aggData
  }

  await initializeTVLCacheDB()

  const data = await TABLES.DIMENSIONS_DATA.findAll({
    where: {
      // id: '5599',
      [Op.or]: [
        Sequelize.literal(`(data->'aggregated'->>'doi') IS NOT NULL`),
        Sequelize.literal(`(data->'aggregated'->>'dsoi') IS NOT NULL`),
        Sequelize.literal(`(data->'aggregated'->>'dloi') IS NOT NULL`),
      ],
      type: {
        [Op.ne]: 'open-interest'
      },
      // timeS: '2025-09-01'
    }
  })
  console.log('Found', data.length, 'records with OI')
  const unixTS = new Date()
  fs.writeFileSync(`createOI_backup_${unixTS}.log`, JSON.stringify(data))

  // Create new records with type 'open-interest'
  const newRecords = data.map(record => ({
    id: record.dataValues.id,
    timeS: record.dataValues.timeS,
    timestamp: record.dataValues.timestamp,
    createdat: record.dataValues.createdat,
    data: {
      aggregated: cleanData(record.dataValues.data.aggregated),
    },
    type: 'open-interest',
    updatedat: unixTS
  }));

  // Bulk insert the new records with upsert option
  console.log(`Inserting ${newRecords.length} new records with type 'open-interest'`);
  await TABLES.DIMENSIONS_DATA.bulkCreate(newRecords, {
    updateOnDuplicate: ['type', 'updatedat', 'data']
  });


  await TABLES.DIMENSIONS_DATA.sequelize?.close()
}
