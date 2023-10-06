
import protocols from "../../protocols/data";
import entities from "../../protocols/entities";
import treasuries from "../../protocols/treasury";

import * as fs from 'fs'
import { METADATA_FILE } from "../constants";

fs.writeFileSync(METADATA_FILE, JSON.stringify({ protocols, entities, treasuries }))