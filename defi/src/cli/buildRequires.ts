import protocols from "../protocols/data";
import { writeFileSync } from "fs"

const allModulesFile = './src/utils/imports/adapters.ts';

writeFileSync(allModulesFile, `

export default {
    ${protocols.map(p=>`"${p.module}": require("@defillama/adapters/projects/${p.module}"),`).join('\n')}
}`)

const adaptersJSON: Record<string, any> = require('../../'+allModulesFile).default as Record<string, any>;

Object.entries(adaptersJSON).forEach(([_, value]) => clearFunctions(value));

writeFileSync("./src/utils/imports/adapters.json", JSON.stringify(adaptersJSON, null, 2))

function clearFunctions(obj: Record<string, any>) {
    Object.keys(obj).forEach((key: any) => {
        const value: any = obj[key]
        if (typeof value === 'function') delete obj[key]
        else if (typeof value === 'object') clearFunctions(obj[key])
    })
    return obj
}