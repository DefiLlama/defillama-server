/**
 * This script/step is needed because prebuild generates tvl imports file, but it is not yet created on the first run
 * This means protocol metadata is still incomplete while that process is running (misrerpresentedTokens, methodology, etc. are imported from tvl adapter file) 
 */

import * as fs from 'fs'

import protocols from "./protocols/data";
import entities from "./protocols/entities";
import parentProtocols from "./protocols/parentProtocols";
import treasuries from "./protocols/treasury";
import { chainCoingeckoIds } from "./utils/normalizeChain";
import { METADATA_FILE } from "./api2/constants";

async function main() {
  let data: any = { protocols, entities, treasuries, parentProtocols, chainCoingeckoIds }
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data))
}

main().catch(console.error).then(() => process.exit(0))
