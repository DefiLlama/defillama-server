import * as fs from 'fs';
import { initializeTVLCacheDB } from '../../db';
import { TABLES } from '../../db';
import path from 'path';

const file = 'undefined-2025-05-08-1826.log'

const fixInfo: any = {
  fees: {
    '4831': {
      'undefined': 'lightlink_phoenix',
    },
    '447': {
      'immutablex': 'imx',
    },
    '1892': {
      'chiliz': 'chz',
    },
    '2251': {
      'haqq': 'islm',
    },
    '5474': {
      'bitlayer': 'btr',
      'archway-1': 'archway',
    },
    'chain#chiliz': {
      'chiliz': 'chz',
    },
    'chain#bitlayer': {
      'bitlayer': 'btr',
    },
    'chain#superposition': {
      'superposition': 'spn',
    },
  },
  dexs: {
    '4590': {
      'bitlayer': 'btr',
    },
  },
  aggregators: {
    '1282': {
      'bitlayer': 'btr',
    },
    '4691': {
      'bitlayer': 'btr',
    },
    '4926': {
      'bitlayer': 'btr',
    },
    '5474': {
      'bitlayer': 'btr',
      'archway-1': 'archway',
    },
  },
  options: {
    '4630': {
      'bitlayer': 'btr',
    },
  },
  'bridge-aggregators': {
    '5474': {
      'bitlayer': 'btr',
      'archway-1': 'archway',
    },
  },
}
const filePath = path.join(__dirname, file)
const fileData = fs.readFileSync(filePath, 'utf8')
const parsedData = JSON.parse(fileData)

let fixedDataAll = {} as any
for (const [adapterType, protocols] of Object.entries(parsedData)) {
  for (const [id, data] of Object.entries(protocols as any)) {
    const fixValue = fixInfo[adapterType]?.[id]
    if (!fixValue) {
      delete (protocols as any)[id]
    } else {
      let fixedData = data
      for (const [origValue, fixedValue] of Object.entries(fixValue)) {
        fixedData = fixUndefinedValues(fixedData, origValue, fixedValue);
        (protocols as any)[id] = fixedData
      }
    }
  }
  fixedDataAll[adapterType] = protocols
}

fs.writeFileSync(path.join(__dirname, `fixed-${file}`), JSON.stringify(fixedDataAll, null, 2), 'utf8')
console.log('Fixed data saved to fixed-', file)


function fixUndefinedValues(data: any, origValue: string, fixValue: any) {
  fixValue = '"' + fixValue + '"'
  const fixedDataStr = JSON.stringify(data) // Deep clone the data to avoid mutating the original object
  const replaced = fixedDataStr.replace(new RegExp('"' + origValue + '"', 'g'), fixValue)
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