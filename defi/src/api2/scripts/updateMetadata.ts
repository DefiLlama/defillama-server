
import protocols from "../../protocols/data";
import parentProtocols from "../../protocols/parentProtocols";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";
import { chainCoingeckoIds } from "../../utils/normalizeChain";

import * as fs from 'fs'
import { METADATA_FILE } from "../constants";

async function run() {
  const data: any = { protocols, entities, treasuries, parentProtocols, chainCoingeckoIds, }
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data))
}

run().catch(console.error).then(() => process.exit(0))