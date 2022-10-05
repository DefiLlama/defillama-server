import protocols from "../protocols/data";
import { writeFileSync } from "fs"
import volumeAdapters from "../dexVolumes/dexAdapters";
import {readdirSync} from "fs"

writeFileSync("./src/utils/imports/adapters.ts",
    `export default {
    ${protocols.map(p => `"${p.module}": require("@defillama/adapters/projects/${p.module}"),`).join('\n')}
}`)

writeFileSync("./src/utils/imports/adapters_volumes.ts",
    `export default {
    ${volumeAdapters.map(p => `"${p.volumeAdapter}": require("@defillama/adapters/volumes/adapters/${p.volumeAdapter}"),`).join('\n')}
}`)

const excludeLiquidation = ["test.ts", "utils", "README.md"]
writeFileSync("./src/utils/imports/adapters_liquidations.ts",
    `export default {
    ${readdirSync("./DefiLlama-Adapters/liquidations").filter(f=>!excludeLiquidation.includes(f))
        .map(f => `"${f}": require("@defillama/adapters/liquidations/${f}"),`).join('\n')}
}`)
