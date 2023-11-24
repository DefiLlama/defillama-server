import * as sdk from '@defillama/sdk'
import { execSync } from 'child_process'
import * as fs from 'fs'

import protocols from "./protocols/data";
import entities from "./protocols/entities";
import parentProtocols from "./protocols/parentProtocols";
import treasuries from "./protocols/treasury";
import { METADATA_FILE, PG_CACHE_KEYS } from "./api2/constants";

const updateMetadataCMD = `node ${__dirname}/api2/scripts/updateMetadataExtra.js`

async function main() {
  let data: any = { protocols, entities, treasuries, parentProtocols, }
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data))
  execSync(updateMetadataCMD, { stdio: 'inherit' });

  data = fs.readFileSync(METADATA_FILE, 'utf8')
  data = JSON.parse(data)
  if (!process.env.SKIP_CAHE_WRITE_R2)
    await sdk.cache.writeCache(PG_CACHE_KEYS.PROTOCOL_METADATA_ALL, data)
}

main().catch(console.error).then(() => process.exit(0))