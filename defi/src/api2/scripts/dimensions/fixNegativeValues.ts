import * as fs from 'fs';
import { initializeTVLCacheDB } from '../../db';
import { TABLES } from '../../db';
import path from 'path';

const file = 'negativeValues-2025-05-02-1863.log'
const filePath = path.join(__dirname, file)
const fileData = fs.readFileSync(filePath, 'utf8')
const parsedData = JSON.parse(fileData)

let fixedDataAll = {} as any
for (const [adapterType, protocols] of Object.entries(parsedData)) {
  fixedDataAll[adapterType] = fixNegativeValues(protocols)
}

fs.writeFileSync(path.join(__dirname, `fixed-${file}`), JSON.stringify(fixedDataAll, null, 2), 'utf8')
console.log('Fixed data saved to fixed-', file)


function fixNegativeValues(data: any) {
  const fixedData = JSON.parse(JSON.stringify(data)) // Deep clone the data to avoid mutating the original object
  Object.keys(fixedData).forEach((key) => {
    const protocol = fixedData[key]
    Object.keys(protocol.badRecords).forEach((recordKey) => {
      const record = protocol.badRecords[recordKey]
      const { aggregated, breakdown } = record
      if (breakdown) {
        Object.keys(breakdown).forEach((key) => {
          const breakdownItems = Object.values(breakdown[key])
          breakdownItems.forEach((item: any) => {
            Object.entries(item.chains ?? {}).forEach(([chain, chainData]: any) => {
              if (chainData >= 0) return;
              if (chainData < 0) item.chains[chain] = 0
              item.value += chainData * -1
              aggregated[key].chains[chain] += chainData * -1
              aggregated[key].value += chainData * -1
            })
          })
        })
      } else {
        Object.keys(aggregated).forEach((key) => {
          const obj = aggregated[key]
          Object.entries(obj.chains ?? {}).forEach(([chain, chainData]: any) => {
            if (chainData >= 0) return;
            if (chainData < 0) obj.chains[chain] = 0
            obj.value += chainData * -1
          })
        })

      }
    })
  })
  return fixedData
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