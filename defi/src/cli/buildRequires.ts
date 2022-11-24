import protocols from "../protocols/data";
import { writeFileSync, readdirSync } from "fs"

function getUnique(arry: string[]) {
    return [...new Set(arry)]
}

writeFileSync("./src/utils/imports/adapters.ts",
    `export default {
    ${getUnique(protocols.map(p => `"${p.module}": require("@defillama/adapters/projects/${p.module}"),`)).join('\n')}
}`)

const excludeLiquidation = ["test.ts", "utils", "README.md"]
writeFileSync("./src/utils/imports/adapters_liquidations.ts",
    `export default {
    ${readdirSync("./DefiLlama-Adapters/liquidations").filter(f => !excludeLiquidation.includes(f))
        .map(f => `"${f}": require("@defillama/adapters/liquidations/${f}"),`).join('\n')}
}`)


// For adapters type adaptor
function getDirectories(source: string) {
    return readdirSync(source, { withFileTypes: true })
        .map(dirent => dirent.name)
}

const extensions = ['ts', 'md', 'js']
function removeDotTs(s: string) {
    const splitted = s.split('.')
    if (splitted.length > 1 && extensions.includes(splitted[1]))
        splitted.pop()
    return splitted.join('.')
}

const excludeKeys = ["index", "README"]
const importPaths = [
    {
        basePackagePath: "@defillama/adaptors", // how is defined in package.json
        baseFolderPath: "./adapters", // path relative to current working directory -> `cd /defi`
        folderPath: "dexs", // path relative to baseFolderPath
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: "@defillama/adaptors",
        baseFolderPath: "./adapters",
        folderPath: "fees",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: "@defillama/adaptors",
        baseFolderPath: "./adapters",
        folderPath: "aggregators",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: "@defillama/adaptors",
        baseFolderPath: "./adapters",
        folderPath: "options",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: "@defillama/adaptors",
        baseFolderPath: "./adapters",
        folderPath: "incentives",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: "@defillama/adaptors",
        baseFolderPath: "./adapters",
        folderPath: "protocols",
        excludeKeys: excludeKeys
    }
]

for (const importPath of importPaths) {
    const paths_keys = getDirectories(`${importPath.baseFolderPath}/${importPath.folderPath}`).map(removeDotTs).filter(key => !importPath.excludeKeys.includes(key))
    writeFileSync(`./src/utils/imports/${importPath.folderPath.replace("/", "_")}_adapters.ts`,
        `
        import { Adapter } from "@defillama/adaptors/adapters/types";
        export default {
        ${paths_keys.map(path => `"${path}": require("${importPath.basePackagePath}/${importPath.folderPath}/${path}"),`).join('\n')}
        } as {[key:string]: {default: Adapter} }`)
}