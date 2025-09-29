require("dotenv").config();
import { Op, Sequelize } from 'sequelize';
import { TABLES, initializeTVLCacheDB } from '../db/index'
import * as fs from 'fs'
import { id } from 'ethers';
import loadAdaptorsData from '../../adaptors/data';
import { AdapterType, ProtocolType } from '@defillama/dimension-adapters/adapters/types';
import { AdapterRecord2 } from '../../adaptors/db-utils/AdapterRecord2';
import { getTimestampAtStartOfDay } from '../../utils/date';
import { storeAdapterRecord } from '../../adaptors/db-utils/db2';

let action = () => changeProtocolChain({
  oldId: '6726',
  newId: '6726',
  oldChain: 'ethereum',
  newChain: 'paradex'
})
action = insertRecord

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


action().catch(console.error).then(cleanUp)


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

function getCSVData() {

  const filePath = '/data.csv';
  // Read the file content
  const fileContent = fs.readFileSync(__dirname + filePath, 'utf8');

  // Split the content by lines and remove any empty lines
  const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    console.log('CSV file is empty');
    return;
  }

  // First line contains headers
  const headers = lines[0].split(',').map(header => header.trim());

  // Parse the data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim());

    if (values.length === headers.length) {
      // Create an object for each row
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    } else {
      console.warn(`Skipping row ${i + 1}: Invalid number of columns`);
    }
  }

  console.log(`Successfully parsed ${data.length} rows from CSV`);
  return data;
}

async function storeFromFile() {
  // Path to the CSV file (in the same folder as the script)

  const protocolId = '6751'
  const adapterType = AdapterType.OPEN_INTEREST
  const protocolType = ProtocolType.PROTOCOL

  try {

    const csvData = getCSVData();
    if (!csvData) return;

    // Initialize database if needed
    await initializeTVLCacheDB();
    const { protocolAdaptors } = loadAdaptorsData(adapterType)
    const protocol = protocolAdaptors.find(p => p.id === protocolId)

    const adapterRecords = csvData.map(row => {
      const value = Math.floor(row['total_open_interest'] || '0')
      return AdapterRecord2.formAdaptarRecord2({
        jsonData: {
          timestamp: getTimestampAtStartOfDay(+(new Date(row['day'])) / 1000),
          aggregated: {
            doi: {
              value,
              chains: {
                'zklighter': value
              }
            },
          }
        }, protocolType, adapterType, protocol: protocol!,
      })
    })

    for (const rec of adapterRecords) {
      if (!rec) {
        console.error('Skipping invalid record');
        continue;
      }
      console.log('Storing record for date:', new Date(rec.timestamp * 1000).toISOString().split('T')[0], 'value:', rec.data.aggregated.doi.value)
      await storeAdapterRecord(rec as any)
    }

    console.log('CSV data processing completed');
  } catch (error) {
    console.error('Error reading or parsing CSV file:', error);
  }

}

async function insertRecord() {
  const protocolId = '6726'
  const adapterType = AdapterType.DERIVATIVES
  const protocolType = ProtocolType.PROTOCOL
  const field = 'dv'
  const chain = 'off_chain'
  const value = 85547024232
  // const timestamp = getTimestampAtStartOfDay(+Date.now() / 1000 - 86400)
  const timestamp = 1759100400

  const { protocolAdaptors } = loadAdaptorsData(adapterType)
  const protocol = protocolAdaptors.find(p => p.id === protocolId)
  const record = AdapterRecord2.formAdaptarRecord2({
    jsonData: {
      timestamp,
      aggregated: {
        [field]: {
          value,
          chains: {
            [chain]: value
          }
        },
      }
    }, protocolType, adapterType, protocol: protocol!,
  })

  console.log('Storing record for date:', new Date(record!.timestamp * 1000).toISOString().split('T')[0], 'value:', record!.data.aggregated[field].value)
  await storeAdapterRecord(record as any)
}
