import { writeFileSync } from "fs"
import {nftParentCompanies} from "./parentCompanies"

writeFileSync(__dirname+"/output/parentCompanies.json", JSON.stringify(
    nftParentCompanies.map(c=>({...c, nftCollections:c.nftCollections.map(cc=>[cc[0].toLowerCase(), cc[1]])}))
    , undefined, 2));
// npx ts-node src/nfts/generateJson.ts