import * as fs from 'fs'

import protocols from "./protocols/data";
import entities from "./protocols/entities";
import parentProtocols from "./protocols/parentProtocols";
import treasuries from "./protocols/treasury";
import { chainCoingeckoIds } from "./utils/normalizeChain";
import { METADATA_FILE } from "./api2/constants";
import { importAdapter } from './utils/imports/importAdapter';

async function main() {
  let data: any = { protocols, entities, treasuries, parentProtocols, chainCoingeckoIds }

  updateItemInfo(protocols)
  updateItemInfo(treasuries)
  updateItemInfo(entities)
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data))
}

main().catch(console.error).then(() => process.exit(0))

function updateItemInfo(protocols: any) {
  for (const protocol of protocols) {
    if (!protocol.module || protocol.module === 'dummy.js') {
      protocol.misrepresentedTokens = false
      protocol.hallmarks = []
      continue
    }

    try {
      const module = importAdapter(protocol)
      protocol.misrepresentedTokens = module.misrepresentedTokens
      protocol.hallmarks = module.hallmarks
      protocol.deadFrom = module.deadFrom
      protocol.methodology = module.methodology
      if (module.doublecounted) protocol.doublecounted = module.doublecounted
    } catch (e) {
      console.error(e)
    }
  }
}