import * as sdk from '@defillama/sdk'
import { execSync } from 'child_process'
import * as fs from 'fs'

import protocols from "./protocols/data";
import entities from "./protocols/entities";
import parentProtocols from "./protocols/parentProtocols";
import treasuries from "./protocols/treasury";
import { METADATA_FILE, PG_CACHE_KEYS } from "./api2/constants";
import { initializeTVLCacheDB, readFromPGCache, writeToPGCache } from './api2/db';

const updateMetadataCMD = `node ${__dirname}/api2/scripts/updateMetadataExtra.js`

async function main() {
  let data: any = { protocols, entities, treasuries, parentProtocols, }
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data))
  execSync(updateMetadataCMD, { stdio: 'inherit' });

  data = fs.readFileSync(METADATA_FILE, 'utf8')
  data = JSON.parse(data)
  await sdk.cache.writeCache(PG_CACHE_KEYS.PROTOCOL_METADATA_ALL, data)
  await initializeTVLCacheDB()
  await writeToPGCache(PG_CACHE_KEYS.PROTOCOL_METADATA_ALL, data)
}

main().catch(console.error).then(() => process.exit(0))