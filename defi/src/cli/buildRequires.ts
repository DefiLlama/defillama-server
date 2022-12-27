import protocols from "../protocols/data";
import { writeFileSync, readdirSync } from "fs"
import { Adapter } from "@defillama/dimension-adapters/adapters/types";

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
const baseFolderPath = "./dimension-adapters" // path relative to current working directory -> `cd /defi`
const basePackagePath = "@defillama/dimension-adapters" // how is defined in package.json
const baseGithubURL = "https://github.com/DefiLlama/dimension-adapters/blob/master"
const importPaths = [
    {
        basePackagePath: basePackagePath,
        baseFolderPath: baseFolderPath,
        folderPath: "dexs", // path relative to baseFolderPath
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: basePackagePath,
        baseFolderPath: baseFolderPath,
        folderPath: "fees",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: basePackagePath,
        baseFolderPath: baseFolderPath,
        folderPath: "aggregators",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: basePackagePath,
        baseFolderPath: baseFolderPath,
        folderPath: "options",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: basePackagePath,
        baseFolderPath: baseFolderPath,
        folderPath: "incentives",
        excludeKeys: excludeKeys
    },
    {
        basePackagePath: basePackagePath,
        baseFolderPath: baseFolderPath,
        folderPath: "protocols",
        excludeKeys: excludeKeys
    }
]

for (const importPath of importPaths) {
    const paths_keys = getDirectories(`${importPath.baseFolderPath}/${importPath.folderPath}`).filter(key => !importPath.excludeKeys.includes(key))
    writeFileSync(`./src/utils/imports/${importPath.folderPath.replace("/", "_")}_adapters.ts`,
        `
        import { Adapter } from "@defillama/dimension-adapters/adapters/types";
        export default {
        ${paths_keys.map(path => `"${removeDotTs(path)}": {
            module: require("${importPath.basePackagePath}/${importPath.folderPath}/${removeDotTs(path)}"),
            codePath: "${baseGithubURL}/${importPath.folderPath}/${path}"
        },`).join('\n')}
        } as {[key:string]: {
            module: { default: Adapter },
            codePath: string
        } }`)
}

// Above type should match
export interface IImportObj {
    module: { default: Adapter },
    codePath: string
}