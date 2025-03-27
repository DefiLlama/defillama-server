// NOTE: remember to set AWS region and table name

require("dotenv").config();
import { PromisePool } from '@supercharge/promise-pool'
const fs = require('fs')

const saveFolder = __dirname + '/ohm-forks'
import { getProtocol, } from "./utils";
import {
  dailyTvl,
  dailyTokensTvl,
  dailyUsdTokensTvl,
  dailyRawTokensTvl,
} from "../utils/getLastRecord";
import { getHistoricalValues} from "../utils/shared/dynamodb";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { importAdapterDynamic } from '../../utils/imports/importAdapter';
import { log } from '../../DefiLlama-Adapters/projects/helper/utils'
import { clearProtocolCacheById } from "./utils/clearProtocolCache";
import chains from '@defillama/dimension-adapters/users/chains';
import dynamodb from '../utils/shared/dynamodb';

const protocols = [
  // 'CerberusDAO',
  'fortress',
  'tipidao',
  'templar dao',
  'fortune dao',
  'omicron',
  'GalaxyGoogle DAO',
  'bank of cronos OHM',
  'goblins cash',
  'wagmidao',
  'volta dao',
  'luxor money',
  'atlas usv',
  'immortal',
  'leaguedao',
  'o2 dao',
  'stargate finance',
  'xeus',
  'gyro',
  'maia dao',
  'floor dao',
  'fantohm',
  'hector treasury',
  'klima dao',
  'spartacus',
  'wonderland',
  'Olympus DAO',
]

const protocolTest = [
  'CerberusDAO',
]

const ex_main = async () => {
  setInterval(, 1.5e3);
  let count = 0
  let ethereumBlock = 1e15, chainBlocks = {} // we set ethereum block to absurd number and it will be ignored
  for (const protocolName of protocolTest) {
    console.log('filling for ', protocolName)
    const protocol = getProtocol(protocolName);
    const tProtocol = getProtocol(protocolName + ' (Treasury)');
    // console.log(protocol)
    // console.log(tProtocol)
    // const dailyTvls = await getDailyItems(dailyRawTokensTvl(protocol.id))
    const dailyTvls = await Promise.all([
      getHistoricalValues(dailyRawTokensTvl(protocol.id)),
      getHistoricalValues(dailyTvl(protocol.id)),
      getHistoricalValues(dailyTokensTvl(protocol.id)),
      getHistoricalValues(dailyUsdTokensTvl(protocol.id)),
    ]);
    // console.log(JSON.stringify(dailyTvls, null, 2))
    let adapterModule: any = await importAdapterDynamic(tProtocol)
    adapterModule = { ...adapterModule }

    await PromisePool
      .withConcurrency(21)
      .for(dailyTvls)
      .process(async (tvlRecord: any) => {
        const { SK: timestamp } = tvlRecord
        const { default: ignored, ...restOfModule } = adapterModule
        const moduleObj: any = {}
        Object.entries(restOfModule).forEach((i: any) => {
          const [chain, chainObj] = i
          const chainName = chain === 'avax' ? 'avalanche' : chain
          if (typeof chainObj !== 'object' || typeof chainObj.tvl !== 'function') return;
          const tvl = () => (tvlRecord[chainName] ?? tvlRecord[chain]) ?? 0
          if (!tvlRecord[chainName] && !tvlRecord[chain]) {
            console.log(chain, chainName, tvlRecord, tvlRecord[chainName], tvlRecord[chain], restOfModule)
            process.exit(1)
            throw new Error('Missing chain')
          }
          moduleObj[chain] = { tvl }
        })
        const tvl = await storeTvl(timestamp, ethereumBlock, chainBlocks, tProtocol, moduleObj, {}, 4, false, false, false, undefined);
        console.log(++count, 'Refilled', tProtocol.name, timestamp, new Date(timestamp * 1000).toDateString(), tvl);
      })

    // await clearProtocolCacheById(protocol.id)
    await clearProtocolCacheById(tProtocol.id)

  }
};


const fetchData = async () => {
  for (const protocolName of protocols) {
    console.log('fetching data for ', protocolName)
    const protocol = getProtocol(protocolName);
    const tProtocol = getProtocol(protocolName + ' (Treasury)');
    // console.log(protocol)
    // console.log(tProtocol)
    // const dailyTvls = await getDailyItems(dailyRawTokensTvl(protocol.id))
    const data = await Promise.all([
      getHistoricalValues(dailyRawTokensTvl(protocol.id)),
      getHistoricalValues(dailyTvl(protocol.id)),
      getHistoricalValues(dailyTokensTvl(protocol.id)),
      getHistoricalValues(dailyUsdTokensTvl(protocol.id)),
    ]);
    fs.writeFileSync(`${saveFolder}/${protocolName}.json`, JSON.stringify(data))
    // await clearProtocolCacheById(protocol.id)
    // await clearProtocolCacheById(tProtocol.id)

  }
};

const updateData = async () => {
  // return fetchData()
  for (const protocolName of protocols) {
    console.log('fetching data for ', protocolName)
    const protocol = getProtocol(protocolName);
    const tProtocol = getProtocol(protocolName + ' (Treasury)');
    const PKs = [dailyRawTokensTvl, dailyTvl, dailyTokensTvl, dailyUsdTokensTvl,].map(i => i(protocol.id))
    const tPKs = [dailyRawTokensTvl, dailyTvl, dailyTokensTvl, dailyUsdTokensTvl,].map(i => i(tProtocol.id))
    // console.log(PKs, tPKs)
    // console.log(protocol)
    // console.log(tProtocol)
    // const dailyTvls = await getDailyItems(dailyRawTokensTvl(protocol.id))
    const data = JSON.parse(fs.readFileSync(`${saveFolder}/${protocolName}.json`))
    const treasuryData = JSON.parse(fs.readFileSync(`${saveFolder}/${protocolName}.json`))
    // data.forEach((v: any, i: any) => data[i] = v.slice(0, 4))
    // treasuryData.forEach((v: any, i: any) => treasuryData[i] = v.slice(0, 4))
    // console.log((JSON.stringify(treasuryData, null, 2)))
    treasuryData.forEach((v: any, j: any) => {
      const PK = tPKs[j]
      treasuryData[j] = v.map((i: any) => {
        i.PK = PK
        Object.entries(i).forEach(([key]) => {
          if (/staking/gi.test(key)) delete i[key]
        })
        return i
      })
    })
    data.forEach((v: any, j: any) => {
      const PK = PKs[j]
      data[j] = v.map((i: any) => {
        Object.entries(i).forEach(([key, value]) => {
          if (['PK', 'SK'].includes(key)) return;
          if (!/staking/gi.test(key)) {
            if (typeof value === 'string' || typeof value === 'number') i[key] = 0
            else i[key] = {}
          }
        })
        i.PK = PK
        return i
      })
    })
    // console.log('treasury:----------',(JSON.stringify(treasuryData, null, 2)))
    // console.log('data-----------', (JSON.stringify(data, null, 2)))
    console.log('updating treasury information for ', protocolName, treasuryData.flat().length)
    await writeItems(treasuryData)
    // for (const datum of treasuryData.flat()) await dynamodb.put(datum)
    console.log('updating tvl information for ', protocolName, data.flat().length)
    await writeItems(data)
    // for (const datum of data.flat()) await dynamodb.put(datum)
    await clearProtocolCacheById(protocol.id)
    await clearProtocolCacheById(tProtocol.id)

  }
};



const main = async () => {
  // return fetchData()
  return updateData()
};

async function writeItems(items: any) {
  await PromisePool
    .withConcurrency(21)
    .for(items.flat())
    .process(async (record: any) => {
      try {
        await dynamodb.put(record)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })
}


main().then(() => {
  log('Done!!!')
  process.exit(0)
})
