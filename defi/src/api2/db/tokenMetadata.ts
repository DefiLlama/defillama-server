import { Tables } from './tables'
import { initializeTVLCacheDB } from './index'

export async function addCMCTokenMetadatas(coins: any[]) {
  await initializeTVLCacheDB()
  const records = coins.map(coin => ({ id: coin.id, data: coin }))
  return Tables.CMC_TOKEN_METADATA.bulkCreate(records, { ignoreDuplicates: true })
}

export async function getAllCMCTokenMetadata() {
  await initializeTVLCacheDB()
  const data: any[] = await Tables.CMC_TOKEN_METADATA.findAll({ attributes: ['data'], raw: true })
  const dataMap: Record<string, any> = {}
  for (const item of data) {
    const coin = item.data
    dataMap[coin.id] = coin
  }
  return dataMap
}

export async function addCGTokenMetadatas(coins: any[]) {
  await initializeTVLCacheDB()
  const records = coins.map(coin => ({ id: coin.id, data: coin }))
  return Tables.CG_TOKEN_METADATA.bulkCreate(records, { ignoreDuplicates: true })
}

export async function getAllCGTokenMetadata() {
  await initializeTVLCacheDB()
  const data: any[] = await Tables.CG_TOKEN_METADATA.findAll({ attributes: ['data'], raw: true })
  const dataMap: Record<string, any> = {}
  for (const item of data) {
    const coin = item.data
    dataMap[coin.id] = coin
  }
  return dataMap
}
