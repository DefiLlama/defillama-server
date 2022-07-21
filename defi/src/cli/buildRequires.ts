import protocols from "../protocols/data";
import { writeFileSync } from "fs"
import volumeAdapters from "../dexVolumes/dexAdapters";

writeFileSync("./src/utils/imports/adapters.ts",
    `export default {
    ${protocols.map(p => `"${p.module}": require("@defillama/adapters/projects/${p.module}"),`).join('\n')}
}`)

writeFileSync("./src/utils/imports/adapters_volumes.ts",
    `export default {
    ${volumeAdapters.map(p => `"${p.volumeAdapter}": require("@defillama/adapters/dexVolumes/${p.volumeAdapter}"),`).join('\n')}
}`)