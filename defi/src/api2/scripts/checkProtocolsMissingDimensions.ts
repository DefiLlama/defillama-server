import '../utils/failOnError'

import * as sdk from "@defillama/sdk";
// import { sendMessage } from '../../utils/discord';
import axios from 'axios';

const lines = [] as string[]

// remember to run npm run prebuild before running this script
async function run() {
  // record time taken to run
  const start = Date.now()
  const { data: allProtocols } = await axios.get('https://api.llama.fi/protocols')
  const { data: appMetadata } = await axios.get('https://api.llama.fi/config/smol/appMetadata-protocols.json')
  const ignoredCategories = new Set(['CEX', ])
  const volumeCategories = new Set(['Dexs', 'Options', 'Derivatives', ])
  const protocolsWithoutDimensions =  allProtocols.filter((protocol: any) => {
    if (protocol.tvl <1e7) return false // skip protocols with tvl < 10m
    if (ignoredCategories.has(protocol.category)) return false // skip cexs
    const metadata = appMetadata[protocol.id]
    if (!metadata) return false // skip protocols without metadata
    if (!metadata.fees && !metadata.revenue) {
      protocol.missing_fees = true
    }

    if (volumeCategories.has(protocol.category)) {
      if (!metadata.volume && metadata.options && !metadata.perps) {
        protocol.missing_volume = true
      }
    }
    protocol.tvl = hn(protocol.tvl)
    return protocol.missing_fees || protocol.missing_volume;
  })

  console.table(protocolsWithoutDimensions, ['name', 'category', 'tvl', 'missing_fees', 'missing_volume'])
}

const hn = (n: number) => n ? sdk.humanizeNumber(Math.round(n)) : '0'

run().catch(console.error).then(() => process.exit(0))
