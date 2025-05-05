import * as fs from 'fs';
import { initializeTVLCacheDB } from '../db';
import { TABLES } from '../db';

const file = 'undefined-2025-05-05-8152.log'

const fixInfo: any = {
  fees: {
    '4831': 'lightlink_phoenix'
  }
}
const filePath = `./${file}`
const fileData = fs.readFileSync(filePath, 'utf8')
const parsedData = JSON.parse(fileData)

let fixedDataAll = {} as any
for (const [adapterType, protocols] of Object.entries(parsedData)) {
  for (const [id, data ] of Object.entries(protocols as any)) {
    const fixValue = fixInfo[adapterType]?.[id]
    if (!fixValue) {
      delete (protocols as any)[id]
    }    else {
      const fixedData = fixUndefinedValues(data, fixValue);
      (protocols as any)[id] = fixedData
    }
    
  }
  fixedDataAll[adapterType] = protocols
}

fs.writeFileSync(`fixed-${file}`, JSON.stringify(fixedDataAll, null, 2), 'utf8')
console.log('Fixed data saved to fixed-', file)


function fixUndefinedValues(data: any, fixValue: any) {
  const fixedDataStr = JSON.stringify(data) // Deep clone the data to avoid mutating the original object
  const replaced = fixedDataStr.replace(/undefined/g, fixValue)
  return JSON.parse(replaced)
}

run().catch((e: any) => {
  console.error(e)
  process.exit(1)
}).then(async () => {
  console.log('Exitting now...')
  process.exit(0)
})

async function run() {
  await initializeTVLCacheDB()
  const adapterTypes = Object.keys(fixedDataAll)
  for (const adapterType of adapterTypes) {
    const protocolIds = Object.keys(fixedDataAll[adapterType])
    for (const id of protocolIds) {
      const pInfo = fixedDataAll[adapterType][id]
      const records = pInfo.badRecords
      for (const [timeS, data] of Object.entries(records)) {
        const matchingRecord = await TABLES.DIMENSIONS_DATA.findOne({
          where: { id, timeS, type: adapterType },
        });
    
        if (matchingRecord) {
          await matchingRecord.update({ data });
          console.log(`Updated record with id: ${id} ${pInfo.name}, timeS: ${timeS}, adapterType: ${adapterType}`);
        } else {
          console.log(`No matching record found for id: ${id}, timeS: ${timeS}, adapterType: ${adapterType}`);
        }
      }
    
    }
  }
}