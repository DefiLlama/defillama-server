import '../../utils/failOnError'

// Protocol datatype is deprecated, this script copies all the protocol records missing in dex & fees type to them

import * as fs from 'fs'
import path from 'path';
import { init } from '../../../adaptors/db-utils/db2';
import { sliceIntoChunks } from '@defillama/sdk/build/util';
import { Tables } from '../../db/tables';

const file = 'protocol-data-2025-05-21-1156.log'
const filePath = path.join(__dirname, file)
const fileData = fs.readFileSync(filePath, 'utf8')
const { missingDexRecordsMap, missingFeesRecordsMap, } = JSON.parse(fileData)

async function run() {

  const newRecords = [] as any[]
  Object.values(missingDexRecordsMap).forEach((records: any) => newRecords.push(...Object.values(records)))
  Object.values(missingFeesRecordsMap).forEach((records: any) => newRecords.push(...Object.values(records)))
  console.log('#newRecords', newRecords.length)
  let chunks = sliceIntoChunks(newRecords, 1000)
  init()
  let i = 0
  for (const chunk of chunks) {
    await Tables.DIMENSIONS_DATA.bulkCreate(chunk, { updateOnDuplicate: ['data'] });
    i++
    console.log('chunk', i, 'of', chunks.length, 'done')
  }

}


run()
  .catch(console.error)
  .then(() => process.exit(0))
