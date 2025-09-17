require("dotenv").config();
import { TABLES, initializeTVLCacheDB } from '../db/index'
import * as fs from 'fs'

async function changeProtocolChain({
  oldId, newId, oldChain, newChain,
}: { oldId: string, newId: string, oldChain: string, newChain: string }) {
  await initializeTVLCacheDB()

  const data = await TABLES.DIMENSIONS_DATA.findAll({
    where: {
      id: oldId,
      // timeS: '2024-08-07'
    }
  })
  console.log('Found', data.length, 'records for protocol', oldId)
  const unixTS = Date.now()
  fs.writeFileSync(`changeProtocolChain_backup_${unixTS}.log`, JSON.stringify(data))

  for (const record of data) {
    let updateNeeded = oldId !== newId
    // Update chain name in each key of 'data' field
    if (record.dataValues.data && typeof record.dataValues.data === 'object') {
      const aggData = Object.values(record.dataValues.data.aggregated) as any
      for (const dimItem of aggData) {
        if (dimItem.chains && dimItem.chains[oldChain] !== undefined) {
          updateNeeded = true
          dimItem.chains[newChain] = dimItem.chains[oldChain]
          delete dimItem.chains[oldChain]
        }
      }
    }

    if (!updateNeeded) continue;

    // If you need to change the primary key, create a new record and delete the old one
    await record.destroy();
    const newRecord = await TABLES.DIMENSIONS_DATA.create({
      ...record.dataValues,
      id: newId,
      data: record.dataValues.data,
      updatedAt: new Date(),
    });
    console.log('replaced record:', newRecord.dataValues.timeS);
  }
  await TABLES.DIMENSIONS_DATA.sequelize?.close()
}

changeProtocolChain({
  oldId: '6664',
  newId: '6664',
  oldChain: 'ethereum',
  newChain: 'paradex'
}).catch(console.error).then(() => {
  console.log('Done')
  process.exit(0)
})
