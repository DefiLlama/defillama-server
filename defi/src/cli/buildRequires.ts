import protocols from "../protocols/data";
import {writeFileSync} from "fs"

writeFileSync("./src/utils/imports/adapters.ts",
`export default {
    ${protocols.map(p=>`"${p.module}": require("@defillama/adapters/projects/${p.module}"),`).join('\n')}
}`)