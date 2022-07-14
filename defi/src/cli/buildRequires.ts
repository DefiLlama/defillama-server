import protocols from "../protocols/data";
import {writeFileSync} from "fs"
import volumeAdapters from "../dexVolumes/dexAdapters";

const volumeAdaptersImports = volumeAdapters.map(p=>`"${p.module}": require("@defillama/adapters/dexVolumes/${p.module}"),`)

writeFileSync("./src/utils/imports/adapters.ts",
`export default {
    ${protocols.map(p=>`"${p.module}": require("@defillama/adapters/projects/${p.module}"),`).concat(volumeAdaptersImports).join('\n')}
}`)