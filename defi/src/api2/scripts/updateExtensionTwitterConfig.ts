import { chainCoingeckoIds } from '../../utils/normalizeChain'
import parentProtocols from '../../protocols/parentProtocols'
import protocols from '../../protocols/data'
import axios from 'axios'
import dynamodb from '../../utils/shared/dynamodb'
import { storeR2JSONString } from '../../utils/r2'


const tvlThreshold = 5e6

async function run() {
  const [
    { Item },
    { data: protocolLiteData }
  ] = await Promise.all([
    dynamodb.getExtensionTwitterConfig(),
    axios.get('https://defillama-datasets.llama.fi/lite/protocols2')
  ])
  if (!Item) throw new Error('Unable to get twitter config')
  const whitelistedHandles = new Set()
  const blacklistedHandles = new Set()
  Item.whitelist?.split(',').forEach((handle: string) => whitelistedHandles.add(handle))
  Item.blacklist?.split(',').forEach((handle: string) => blacklistedHandles.add(handle))

  const idMap = {} as Record<string, string> // id -> twitter handle

  protocols.forEach((protocol) => {
    if (!protocol.twitter || !protocol.id) return;
    idMap[protocol.id] = protocol.twitter
  })

  parentProtocols.forEach((protocol) => {
    if (!protocol.twitter || !protocol.id) return;
    idMap[protocol.id] = protocol.twitter
  })

  Object.entries(chainCoingeckoIds).forEach(([chain, coingeckoId]) => {
    if (coingeckoId.twitter)
      idMap[chain] = coingeckoId.twitter
  })
  const addedChains = {} as Record<string, boolean>

  protocolLiteData.protocols.forEach((protocol: any) => {
    if (protocol.tvl < tvlThreshold) return;
    if (idMap[protocol.id]) whitelistedHandles.add(idMap[protocol.id])
    if (protocol.parentProtocol) {
      if (idMap[protocol.parentProtocol]) whitelistedHandles.add(idMap[protocol.parentProtocol])
    }

    if (protocol.category === "Liquid Staking") return;

    for (const chain of protocol.chains) {
      if (!idMap[chain] || addedChains[chain]) continue;
      if (!protocol.chainTvls?.[chain] || !protocol.chainTvls?.[chain].tvl || protocol.chainTvls?.[chain].tvl < tvlThreshold) continue;
      addedChains[chain] = true
      whitelistedHandles.add(idMap[chain])
    }
  })

  const blacklistedHandlesArray = Array.from(blacklistedHandles)
  blacklistedHandlesArray.forEach((handle) => whitelistedHandles.delete(handle))

  const whitelistedHandlesArray = Array.from(whitelistedHandles)

  console.log('Twitter: Whitelisted handle count', whitelistedHandlesArray.length)
  console.log('Twitter: Blacklisted handle count', blacklistedHandlesArray.length)
  // await storeR2JSONString('extension/twitter-config.json', JSON.stringify({ whitelist: whitelistedHandlesArray, blacklist: blacklistedHandlesArray }), 60 * 60)
  await storeR2JSONString('extension/twitter-config.json', JSON.stringify({ whitelist: [], blacklist: blacklistedHandlesArray }), 60 * 15)
}
/* 
run()
  .then(() => process.exit(0)) */