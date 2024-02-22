
import *as fs from 'fs'
import { ADAPTER_TYPES } from '../handlers/triggerStoreAdaptorData'
import loadAdapterData from './index'
import { AdapterType } from '@defillama/dimension-adapters/adapters/types'


async function run() {
  console.time("**** Run All Adaptor types")
  ADAPTER_TYPES.map((adapterType) => {
    // if (adapterType !== AdapterType.OPTIONS) return;

    const key = "**** Run Adaptor type: " + adapterType
    console.time(key)
    try {
      const data = loadAdapterData(adapterType)
      fs.writeFileSync('test-' + adapterType + '.json', JSON.stringify(data.protocolAdaptors, null, 2))
    } catch (e) {
      console.error("error", e)
    }
    console.timeEnd(key)
  })
  console.timeEnd("**** Run All Adaptor types")
}

run().catch(console.error).then(() => process.exit(0))