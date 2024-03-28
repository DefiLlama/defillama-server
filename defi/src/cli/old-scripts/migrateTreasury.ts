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
import { getHistoricalValues } from "../utils/shared/dynamodb";
import { clearProtocolCacheById } from "./utils/clearProtocolCache";
import dynamodb from '../utils/shared/dynamodb';
import { log } from '../../DefiLlama-Adapters/projects/helper/utils'
import parentProtocols from '../protocols/parentProtocols';

const protocols = [
  'AAVE V2',
  'Compound',
  'Balancer V1',
  'SushiSwap',
  'mStable CDP',
  'Metronome V1',
  'Ribbon',
  'Inverse Finance Frontier',
  'Frax',
  'Benqi Lending',
  'Trader Joe DEX',
  'Hector Treasury',
  'Maia DAO',
  'MahaDAO Arth',
  'BendDAO Lending',
  'handle.fi Perps',
  'Uniswap V3',
  'Zyberswap AMM',
  'Cap V4',
  'Bank of Cronos OHM',
  'LSDx Farm'
].reverse()

const protocolTest = [
  'Bank of Cronos OHM',
]

const fetchData = async () => {
  for (const protocolName of protocols) {
    console.log('fetching data for ', protocolName)
    const protocol = getProtocol(protocolName)
    const parentProtocol = parentProtocols.find(i => i.id === protocol.parentProtocol)
    const oldProtocol = getProtocol(protocolName + ' (Treasury)');
    const newProtocol = getProtocol(parentProtocol?.name + ' (Treasury)');
    console.log('Migrating data ', oldProtocol.name, ' -> ', newProtocol.name)
    const data = await Promise.all([
      getHistoricalValues(dailyRawTokensTvl(oldProtocol.id)),
      getHistoricalValues(dailyTvl(oldProtocol.id)),
      getHistoricalValues(dailyTokensTvl(oldProtocol.id)),
      getHistoricalValues(dailyUsdTokensTvl(oldProtocol.id)),
    ]);
    fs.writeFileSync(`${saveFolder}/${protocolName}-treasury.json`, JSON.stringify(data))
  }
};

const updateData = async () => {
  for (const protocolName of protocols) {
    console.log('fetching data for ', protocolName)
    const protocol = getProtocol(protocolName)
    const parentProtocol = parentProtocols.find(i => i.id === protocol.parentProtocol)
    const oldProtocol = getProtocol(protocolName + ' (Treasury)');
    const newProtocol = getProtocol(parentProtocol?.name + ' (Treasury)');
    const newPKs = [dailyRawTokensTvl, dailyTvl, dailyTokensTvl, dailyUsdTokensTvl,].map(i => i(newProtocol.id))
    const treasuryData = JSON.parse(fs.readFileSync(`${saveFolder}/${protocolName}-treasury.json`))
    treasuryData.forEach((v: any, j: any) => {
      const PK = newPKs[j]
      treasuryData[j] = v.map((i: any) => {
        i.PK = PK
        return i
      })
    })

    console.log('updating treasury information for ', protocolName, newProtocol.name, treasuryData.flat().length)
    // treasuryData.forEach((v: any, i: any) => treasuryData[i] = v.slice(0, 3))
    // console.log(JSON.stringify(treasuryData, null, 2))
    await writeItems(treasuryData)
    await clearProtocolCacheById(newProtocol.id)
  }
};

const deleteData = async () => {
  for (const protocolName of protocols) {
    console.log('deleting data for ', protocolName)
    const tProtocol = getProtocol(protocolName + ' (Treasury)');
    const treasuryData = JSON.parse(fs.readFileSync(`${saveFolder}/${protocolName}-treasury.json`))
    await deleteItems(treasuryData)
    await clearProtocolCacheById(tProtocol.id)
  }
};


const main = async () => {
  // return fetchData()
  // return updateData()
  // return deleteData()
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

async function deleteItems(items: any) {
  await PromisePool
    .withConcurrency(21)
    .for(items.flat())
    .process(async (item: any) => {
      try {
        await dynamodb.delete({
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        })
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
