const fs = require('fs');
const path = require('path');
import * as sdk from '@defillama/sdk'
import * as axios from 'axios'
import dynamodb from '../../utils/shared/dynamodb';

const inputDir = path.join(process.env.TVL_LOCAL_CACHE_ROOT_FOLDER, "/api2-data/pg-cache/dimensions-data")

fs.readdir(inputDir, (err: any, files: any) => {
  if (err) {
    console.error(`Error reading directory: ${err}`);
    return;
  }

  files.forEach((file: any) => {
    const filePath = path.join(inputDir, file);
    fs.readFile(filePath, 'utf8', async (err: any, data: any) => {
      if (err) {
        // console.error(`Error reading file ${file}: ${err}`);
        return;
      }

      const json = JSON.parse(data)
      await processFile(file, json)
    });
  });
});

async function processFile(file: any, json: any) {
  const { data } = json
  for (let [key, value] of Object.entries(data)) {
    if (key === '1-ti-ALL') continue;
    // if (key.endsWith('-LAST') || key.endsWith('-TIMESTAMP')) continue;
    if (key.endsWith('-LAST') || key.endsWith('-TIMESTAMP')) value = [value]
    if (!(value as any).filter) {
      console.log('yo, this is wrong', file, key, value)
      continue;
    }

    await replaceBalancesObjects(file, key, value)
    await migrateErrorRecords(file, key, value)

  }
}

async function migrateErrorRecords(file: any, key: any, value: any) {
  // if (!key.startsWith('3816')) return;

  const [errorRecords, updateRecords] = getErrorObjects(value as any)
  if (errorRecords.length || updateRecords.length) {
    console.log('error records:', file, key, errorRecords.length, updateRecords.length, updateRecords.filter(isEmpty).length)
    // return;
    const promises = [] as any[]
    // console.log('update records:', file, key, updateRecords.length, errorRecords.slice(0, 3), updateRecords.slice(0, 3))
    for (const item of errorRecords) {
      await dynamodb.put(item)
    }
    const deleteRecords = updateRecords.filter(isEmpty)
    for (const item of deleteRecords) {
      // console.log('deleting', item.PK, item.SK)
      if (item.PK && item.SK)
        await dynamodb.delete({ Key: { PK: item.PK, SK: item.SK } })
    }
    const updateRecords2 = updateRecords.filter((item: any) => !isEmpty(item))
    for (const item of updateRecords2) {
      // console.log('updating', item.PK, item.SK)
      await dynamodb.put(item)
    }
    await Promise.all(promises)
  }
}

async function replaceBalancesObjects(file: any, key: any, value: any) {
  value = (JSON.parse(JSON.stringify(value)) as any).map(removeErrorField)
  const problematicRecords = (value as any).filter(({ data }: any, i: any) => {
    if (!data) return;
    return Object.keys(data).some(k1 => {
      if (typeof data[k1] !== 'object') return false
      return Object.keys(data[k1]).some(k2 => {
        if (typeof data[k1][k2] === 'object') return Object.keys(data[k1][k2]).length !== 0
        return typeof data[k1][k2] !== 'number'
      })
    })
  })

  if (problematicRecords.length) {
    console.log('problematic records:', file, key, problematicRecords.length)
    // console.log('problematic records:', file, key, problematicRecords.length, JSON.stringify(problematicRecords, null, 2))
    // await modifyProblematicRecords(key, problematicRecords)
  }
}

async function modifyProblematicRecords(file: any, json: any) {
  if (!file.startsWith('3643')) return console.log('skipping update', file);
  console.log('modifying records', file, json.length)
  for (const item of json) {
    const { data, timestamp } = item
    const PK = `${item.type}#${item.protocolType}#${item.adaptorId}`
    if (PK === 'ti#chain#1') return;
    const SK = timestamp
    for (const [k1, v1] of Object.entries(data)) {
      if (typeof v1 !== 'object') continue;
      for (const [k2, v2] of Object.entries(v1 as any)) {
        if (typeof v2 !== 'object') continue;
        data[k1][k2] = await getUSDVaule(v2 as any, timestamp)
        console.log(PK, k1, k2, Number(data[k1][k2] / 1e3).toFixed(3), new Date(timestamp * 1000))
        const item = { ...data, PK, SK, }
        // console.log('putting', item)
        await dynamodb.put(item)
        // console.log(item)
        // process.exit(0)
      }
    }
  }
}

const decimals = {} as any

async function getUSDVaule(json: any, timestamp: any) {
  const tokens = Object.keys(json)
  const missingDecimals = tokens.filter(t => !decimals[t])
  if (missingDecimals.length) {
    const { data: { coins } } = await axios.default.get(`https://coins.llama.fi/prices/current/${tokens.join(',')}`)
    for (const [token, val] of Object.entries(coins)) {
      decimals[token] = (val as any).decimals
    }
  }
  Object.entries(json).forEach(([token, balance]: any) => {
    if (typeof decimals[token] === 'number')
      json[token] = balance * 10 ** decimals[token]
  })
  return sdk.Balances.getUSDValue(json, timestamp)
}

// iterate through object and delete 'error' fields
function removeErrorField(obj: any) {
  if (!Array.isArray(obj) && typeof obj !== 'object') return obj;
  for (const key in obj) {
    if (key === 'error') { // delete error field or should be set it as empty? 
      delete obj[key]
    } else if (typeof obj[key] === 'object') {
      removeErrorField(obj[key])
    }
  }
  return removeEmptyObjects(obj)
}

function removeEmptyObjects(obj: any) {
  if (typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      removeEmptyObjects(obj[key])
      if (!Object.keys(obj[key]).length) {
        delete obj[key]
      }
    }
  }
  return obj
}

function getErrorObjects(arry: any) {
  const updateRecords = [] as any[]
  const errorRecords = arry.map((item: any) => {
    const { data: { eventTimestamp, ...rest } } = item
    const PK = `${item.type}#${item.protocolType}#${item.adaptorId}`
    const SK = item.timestamp
    let hasError = false
    const errorData = { eventTimestamp } as any
    Object.entries(rest).forEach(([k1, v1]: any) => {
      if (typeof v1 !== 'object') return;
      if (v1.error) {
        errorData[k1] = v1.error
        hasError = true
      }
    })
    if (hasError) {
      updateRecords.push({ ...removeEmptyObjects(removeErrorField(item.data)), PK, SK, })
      return { ...errorData, PK: `${PK}#error`, SK, }
    }
  }).filter((item: any) => item)
  return [errorRecords, updateRecords]
}

// catch uncaught exceptions, trace, then exit normally
process.on('uncaughtException', (e: any) => {
  console.error('Uncaught Exception...')
  console.error(e.stack)
  process.exit(1)
})

function isEmpty(obj: any) {
  if (typeof obj !== 'object') return false;
  const { PK, SK, eventTimestamp, ...rest } = obj
  return !Object.keys(rest).length
}