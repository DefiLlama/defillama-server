import { writeFileSync } from "fs"
import {nftParentCompanies} from "./parentCompanies"

writeFileSync(__dirname+"/output/parentCompanies.json", JSON.stringify(nftParentCompanies, undefined, 2));