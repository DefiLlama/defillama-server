import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, } from "../utils/database";
import axios from 'axios'

export function elexium(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'alephium'

async function getPools() {
  const { data } = await axios.get('https://api.elexium.finance/tokens')
  const filteredPools = data
    .filter((i: any) => i.symbol && !i.symbol.startsWith('vAMM-') && !i.symbol.startsWith('sAMM-') )
  log('Pools', data.length, filteredPools.length)
  return filteredPools
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  pools.forEach(({  id, symbol, decimals, onchainPrice: price }: any) => {
    if (!price) return;
    symbol = symbol.replace(/ /g, '-').toUpperCase()
    // returning bad data 
    addToDBWritesList(writes, chain, id, 0, decimals, symbol, timestamp, 'elexium', 0.9)
  })

  return writes
}
