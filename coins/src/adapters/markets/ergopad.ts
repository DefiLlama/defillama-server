import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import axios from 'axios'

export function ergopad(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'ergo'

async function getPools() {
  const { data: { items } } = await axios.get('https://api.ergoplatform.com/api/v1/boxes/unspent/byErgoTree/1999030f0400040204020404040405feffffffffffffffff0105feffffffffffffffff01050004d00f040004000406050005000580dac409d819d601b2a5730000d602e4c6a70404d603db63087201d604db6308a7d605b27203730100d606b27204730200d607b27203730300d608b27204730400d6099973058c720602d60a999973068c7205027209d60bc17201d60cc1a7d60d99720b720cd60e91720d7307d60f8c720802d6107e720f06d6117e720d06d612998c720702720fd6137e720c06d6147308d6157e721206d6167e720a06d6177e720906d6189c72117217d6199c72157217d1ededededededed93c27201c2a793e4c672010404720293b27203730900b27204730a00938c7205018c720601938c7207018c72080193b17203730b9593720a730c95720e929c9c721072117e7202069c7ef07212069a9c72137e7214067e9c720d7e72020506929c9c721372157e7202069c7ef0720d069a9c72107e7214067e9c72127e7202050695ed720e917212730d907216a19d721872139d72197210ed9272189c721672139272199c7216721091720b730e?limit=500&offset=0')
  const filteredPools = items.filter((i: any) => i.value > 500 * 1e9) // ignore pools with less than 500 ERG
  log('Pools', items.length, filteredPools.length)
  return filteredPools
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  const baseTokenInfo = await getTokenAndRedirectData(['ergo'], 'coingecko', timestamp)
  const basePrice = baseTokenInfo[0].price
  addToDBWritesList(writes, chain, '0x0000000000000000000000000000000000000000', basePrice, 9, 'ERG', timestamp, 'ergo', 0.9)
  const priceLog: any[] = []
  pools.forEach(({ value: quantityA, assets: [_, _1, { amount: quantityB, tokenId, decimals, name }] }: any) => {
    const token = tokenId.toLowerCase()
    const symbol = name.replace(/ /g, '-').toUpperCase()
    const price = quantityA * (10 ** (decimals - 9)) / quantityB
    priceLog.push({ symbol, price: Number(basePrice * price).toFixed(4), decimals, token })
    addToDBWritesList(writes, chain, token, basePrice * price, decimals, symbol, timestamp, 'ergo', 0.9)
  })

  return writes
}
