
import _protocols from "../../protocols/data";
import parentProtocols from "../../protocols/parentProtocols";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";

import * as fs from 'fs'
import { METADATA_FILE } from "../constants";
import { importAdapter } from "../../utils/imports/importAdapter";
import sluggify from "../../utils/sluggify";

const protocols: any[] = _protocols

async function run() {
  const data: any = { protocols, entities, treasuries, map: {}, parentProtocols }
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data))
}

run().catch(console.error).then(() => process.exit(0))