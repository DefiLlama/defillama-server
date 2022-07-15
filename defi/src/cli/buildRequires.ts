import protocols from "../protocols/data";
import {writeFileSync} from "fs"
import volumeAdapters from "../dexVolumes/dexAdapters";
import { volumeAdapterPrefix } from "../dexVolumes/constants";

const volumeAdaptersImports = volumeAdapters.map(p=>`"${volumeAdapterPrefix}${p.volumeAdapter}": require("@defillama/adapters/dexVolumes/${p.volumeAdapter}"),`)

writeFileSync("./src/utils/imports/adapters.ts",
`export default {
    ${protocols.map(p=>`"${p.module}": require("@defillama/adapters/projects/${p.module}"),`).concat(volumeAdaptersImports).join('\n')}
}`)