import axios from 'axios'
import { deleteProtocolCache } from '../../utils/r2'
import { getDailyTvlCacheId, } from '../../api2/db'
import path from 'path'

export async function clearProtocolCache(protocolName: string) {
  const { data: protocols } = await axios.get('https://api.llama.fi/protocols')
  protocolName = protocolName.toLowerCase().trim()
  const protocolId = protocols.find((p: any) => p.name.toLowerCase() === protocolName.toLowerCase())?.id
  if (protocolId === undefined) {
    return console.log("No protocol with that name!")
  }
  await deleteProtocolCache(protocolId)
  return console.log("Protocol cache deleted: ", protocolName)
}

export async function clearProtocolCacheById(protocolId: string) {
  // await initializeTVLCacheDB()
  // await deleteProtocolCache(protocolId)
  let { API2_SERVER_URL }: any = process.env
  if (!API2_SERVER_URL) throw new Error('Missing required env var: API2_SERVER_URL')
  const pgCaceId = getDailyTvlCacheId(protocolId)
  if (API2_SERVER_URL.includes(','))
    API2_SERVER_URL = API2_SERVER_URL.split(',')
  else
    API2_SERVER_URL = [API2_SERVER_URL]


  for (const url of API2_SERVER_URL) {
    // let endpoint = path.join(url, '_internal/debug-pg/', pgCaceId)
    let endpoint = path.join(url, 'debug-pg/', pgCaceId)
    await axios.delete(endpoint, {
      headers: {
        'x-internal-secret': process.env.LLAMA_INTERNAL_ROUTE_KEY ?? process.env.LLAMA_PRO_API2_SECRET_KEY ?? process.env.API2_SUBPATH
      }
    }).then(() => console.log(`Cache cleared for protocol ${protocolId}`))
    .catch(_e => console.log(`Failed to clear cache for protocol ${protocolId}`))
  }

  // await deleteFromPGCache(pgCaceId) // clear postgres cache as well
  // add command do it via discord bot
  // return console.log("Protocol cache deleted id: ", protocolId)
}


export async function clearAllDimensionsCache() {
  const { API2_DIMENSIONS_SERVER_URL } = process.env
  if (!API2_DIMENSIONS_SERVER_URL) throw new Error('Missing required env var: API2_DIMENSIONS_SERVER_URL')
  await axios.delete(`${API2_DIMENSIONS_SERVER_URL}_internal/debug-pg/clear-dimensions-cache`)
  return console.log("All dimensions cache cleared")
}