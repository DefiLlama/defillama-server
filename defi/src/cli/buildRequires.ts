import protocols from "../protocols/data";
import treasuries from "../protocols/treasury";
import { writeFileSync, readdirSync } from "fs"
import { execSync } from "child_process"
import { Adapter } from "@defillama/dimension-adapters/adapters/types";
import entities from "../protocols/entities";

function getUnique(arry: string[]) {
    return [...new Set(arry)]
}

writeFileSync("./src/utils/imports/adapters.ts",
    `export default {
    ${getUnique(protocols.concat(treasuries).concat(entities).map(p => `"${p.module}": require("@defillama/adapters/projects/${p.module}"),`)).join('\n')}
}`)

createImportAdaptersJSON()

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
    if (splitted.length > 1 && extensions.includes(splitted[splitted.length - 1]))
        splitted.pop()
    return splitted.join('.')
}

// dimension-adapters

const excludeKeys = ["index", "README"]
const baseFolderPath = "./dimension-adapters" // path relative to current working directory -> `cd /defi`
const basePackagePath = "@defillama/dimension-adapters" // how is defined in package.json
const baseGithubURL = "https://github.com/DefiLlama/dimension-adapters/blob/master"
const importPaths = [
    "dexs",
    "fees",
    "aggregators",
    "options",
    "incentives",
    "protocols",
    "aggregator-derivatives",
]

for (const folderPath of importPaths) {
    const paths_keys = getDirectories(`${baseFolderPath}/${folderPath}`).filter(key => !excludeKeys.includes(key))
    writeFileSync(`./src/utils/imports/${folderPath.replace("/", "_")}_adapters.ts`,
        `
import { Adapter } from "@defillama/dimension-adapters/adapters/types";
export default {
${paths_keys.map(path => createDimensionAdaptersModule(path, folderPath)).join('\n')}
} as {[key:string]: {
    module: { default: Adapter },
    codePath: string
} }


function mockTvlFunction() {
    throw new Error('This is a mock function, you should not be calling it, maybe you need to use importAdapterDynamic instead?')
}

// code to replace function string with mock functions in an object all the way down
function mockFunctions(obj: any) {
    if (obj === "llamaMockedTVLFunction") {
        return mockTvlFunction
    } else if (typeof obj === "object") {
        Object.keys(obj).forEach((key) => obj[key] = mockFunctions(obj[key]))
    }
    return obj
}
        `)
}

function createDimensionAdaptersModule(path: string, folderPath: string) {
    const moduleFilePath = `${basePackagePath}/${folderPath}/${removeDotTs(path)}`
    let moduleString = `require("${moduleFilePath}")`

    // if (process.env.IS_API2_SERVER) {
        const module = mockFunctions(require(moduleFilePath))
        moduleString = `mockFunctions(${JSON.stringify(module)})`
    // }

    return `"${removeDotTs(path)}": {
        moduleFilePath: "${moduleFilePath}",
        module: ${moduleString},
        codePath: "${baseGithubURL}/${folderPath}/${path}"
    },`
}

// Above type should match
export interface IImportObj {
    module: { default: Adapter },
    codePath: string
    moduleFilePath: string
}

// emissions-adapters
const emission_keys = getDirectories(`./emissions-adapters/protocols`)
writeFileSync(`./src/utils/imports/emissions_adapters.ts`,
    `export default {
    ${emission_keys.map(k => `"${removeDotTs(k)}":require("@defillama/emissions-adapters/protocols/${k}"),`).join('\n')}
}`)

function createImportAdaptersJSON() {
    const adaptersFile = __dirname + "/../utils/imports/tvlAdapterData.json"
    let data: any = {}
    protocols.concat(treasuries).concat(entities).map(p => data[p.module] = `@defillama/adapters/projects/${p.module}`)
    writeFileSync(adaptersFile, JSON.stringify(data, null, 2))
    execSync(['node', __dirname + "/buildTvlModuleData.js", adaptersFile].join(' '), { stdio: 'inherit' })
}

//Replace all fuctions with mock functions in an object all the way down
function mockFunctions(obj: any) {
    if (typeof obj === "function") {
        return 'llamaMockedTVLFunction'
    } else if (typeof obj === "object") {
        Object.keys(obj).forEach((key) => obj[key] = mockFunctions(obj[key]))
    }
    return obj
}
