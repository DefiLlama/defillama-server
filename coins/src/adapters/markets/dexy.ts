import { log } from '@defillama/sdk'
import { Write, } from "../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../utils/database";
import axios from 'axios'

export function dexy(timestamp: number) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all([
    getTokenPrices(timestamp),
  ])
}
const chain = 'ergo'

async function getPools() {
  const trees = [
    '1013040004020402040404020400040004000404040404060e20ef461517a55b8bfcd30356f112928f3333b5b50faf472e8374081307a09110cf0e202cf9fb512f487254777ac1d086a55cda9e74a1009fe0d30390a3792f050de58f0e201bfea21924f670ca5f13dd6819ed3bf833ec5a3113d5b6ae87d806db29b94b9a040004000e20dbf655f0f6101cb03316e931a689412126fefbfb7c78bd9869ad6a1a58c1b4240e20bc685d6ad1703ba5775736308fd892807edc04f48ba7a52e802fab241a59962c0500d807d601b2a5730000d602db6308a7d603db63087201d604b27203730100d605b27202730200d606db6308b2a4730300d6078cb2db6308b2a473040073050001d1ededededed93c27201c2a793b27202730600b27203730700938c7204018c720501938cb27203730800018cb272027309000193b17203730aececec937207730b937207730c937207730dedeced91b17206730e938cb27206730f00017310937207731193998c7205028c7204027312',
    '100e04020400040004000400040204020e2074f906985e763192fc1d8d461e29406c75b7952da3a89dbc83fe1b889971e4550e203fefa1e3fef4e7abbdc074a20bdf751675f058e4bcce5cef0b38bb9460be5c6a040404000e206597acef421c21a6468a2b58017df6577b23f00099d9e0772c0608deabdf6d130e2026ef992a598eadfddabfd3c51509fb277b075c943b17199407f68c467b9de1ae0e207a776cf75b8b3a5aac50a36c41531a4d6f1e469d2cbcaa5795a4f5b4c255bf09d804d601b2a5730000d602db63087201d603db6308a7d6048cb2db6308b2a473010073020001d1ecededed93b27202730300b2720373040093c27201c2a7938cb27202730500018cb2720373060001ececec93720473079372047308938cb2db6308b2a4730900730a0001730b937204730c937204730d'
  ]
  const allItems = await Promise.all(trees.map(async (tree) => {
    const { data: { items } } = await axios.get(`https://api.ergoplatform.com/api/v1/boxes/unspent/byErgoTree/${tree}?limit=500&offset=0`)
    return items
  }))
  const items = allItems.flat()
  log('Pools', items.length)
  return items
}

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  let pools = await getPools()
  const [baseTokenInfo] = await getTokenAndRedirectData(['ergo'], 'coingecko', timestamp)
  const basePrice = baseTokenInfo.price
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
