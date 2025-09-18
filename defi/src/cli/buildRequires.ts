// console.log("Building import files for tvl/dimensions/emissions/liquidations adapters")

console.time('build time')
import protocols from "../protocols/data";
import treasuries from "../protocols/treasury";
import { writeFileSync, readdirSync } from "fs"
import { spawn } from "child_process"
import entities from "../protocols/entities";
import { setModuleDefaults } from "@defillama/dimension-adapters/adapters/utils/runAdapter";
import { ADAPTER_TYPES } from "../adaptors/data/types";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { readdir, writeFile } from "fs/promises";

const extensions = ['ts', 'md', 'js']


async function run() {

  const buildFunctions = {
    // 'tvl import': createTVLImportsFile,
    'liquidation import': createLiquidationImportsFile,
    'emissions import': createEmissionsImportsFile,
    'dimensions import': createDimensionsImports,
  }

  await runModule(['tvl import', createTVLImportsFile]) // run first
  const promises = Object.entries(buildFunctions).map(runModule)
  await Promise.all(promises)

  console.timeEnd('build time')
}

run().catch(console.error).then(() => process.exit(0))

function createLiquidationImportsFile() {
  const excludeLiquidation = ["test.ts", "utils", "README.md"]
  writeFileSync("./src/utils/imports/adapters_liquidations.ts",
    `export default {
    ${readdirSync("./DefiLlama-Adapters/liquidations").filter(f => !excludeLiquidation.includes(f))
      .map(f => `"${f}": require("@defillama/adapters/liquidations/${f}"),`).join('\n')}
}`)
}



async function createDimensionsImports() {

  const excludeKeys = new Set(["index", "README", '.gitkeep'])
  const baseFolderPath = "./dimension-adapters" // path relative to current working directory -> `cd /defi`
  const basePackagePath = "@defillama/dimension-adapters" // how is defined in package.json
  const dimensionsImports: any = {}

  for (const folderPath of ADAPTER_TYPES)
    await addAdapterType(folderPath)


  return writeFile("./src/utils/imports/dimensions_adapters.json", JSON.stringify(dimensionsImports))

  async function addAdapterType(folderPath: string) {
    if (folderPath === AdapterType.DERIVATIVES) {
      return; // skip derivatives as they use the same folder as dexs
    }

    dimensionsImports[folderPath] = {}

    try {
      const paths_keys = await getDirectoriesAsync(`${baseFolderPath}/${folderPath}`)
      // console.log(`Found ${paths_keys.length} adapters in ${folderPath}`)

      const promises = paths_keys.map(async (path) => {
        if (excludeKeys.has(path)) return;
        await createDimensionAdaptersModule(path, folderPath)
      })

      return Promise.all(promises)

    } catch (error) {
      console.error(`Error getting directories for ${folderPath}:`, error)
    }
  }

  async function createDimensionAdaptersModule(path: string, adapterType: string) {
    try {
      const fileKey = removeDotTs(path)
      const moduleFilePath = `${adapterType}/${fileKey}`
      const importPath = `${basePackagePath}/${adapterType}/${fileKey}`

      let module = await import(importPath)
      if (!module.default) {
        throw new Error(`Module ${moduleFilePath} does not have a default export`)
      }
      setModuleDefaults(module.default)
      module = mockFunctions(module)
      dimensionsImports[adapterType][fileKey] = {
        moduleFilePath,
        codePath: `${adapterType}/${path}`,
        module: module.default,
      }
    } catch (error: any) {
      console.log(`Error creating module for ${path} in ${adapterType}:`, error.message)
      return ''
    }
  }
}



// emissions-adapters
function createEmissionsImportsFile() {
  const emission_keys = getDirectories(`./emissions-adapters/protocols`)
  writeFileSync(`./src/utils/imports/emissions_adapters.ts`,
    `export default {
    ${emission_keys.map(k => `"${removeDotTs(k)}":require("@defillama/emissions-adapters/protocols/${k}"),`).join('\n')}
}`)
}

async function createTVLImportsFile() {
  await writeFile("./src/utils/imports/adapters.ts",
    `export default {
    ${getUnique(protocols.concat(treasuries).concat(entities).map(p => `"${p.module}": require("@defillama/adapters/projects/${p.module}"),`)).join('\n')}
}`)
  return createTvlAdapterDataJSON()
}

async function createTvlAdapterDataJSON() {
  const adaptersFile = __dirname + "/../utils/imports/tvlAdapterData.json"
  let data: any = {}
  console.log('debug: ', protocols.length)
  protocols.concat(treasuries).concat(entities).map(p => data[p.module] = `@defillama/adapters/projects/${p.module}`)
  await writeFile(adaptersFile, JSON.stringify(data))
  console.log('debug, wrote to' + adaptersFile)
  // we are running this as JS file because it is faster than compiling as ts
  await new Promise((resolve, reject) => {
    const childProcess = spawn('node', [__dirname + "/buildTvlModuleData.js", adaptersFile], {
      stdio: 'inherit'
    });

    childProcess.on('close', (code) => {
      if (code === 0) resolve('done');
      else reject(new Error(`Process exited with code ${code}`));
    });

    childProcess.on('error', reject);
  });
}

//Replace all fuctions with mock functions in an object all the way down
function mockFunctions(obj: any) {
  if (typeof obj === "function") {
    return '_lmtf'  // llamaMockedTVLFunction
  } else if (typeof obj === "object") {
    Object.keys(obj).forEach((key) => obj[key] = mockFunctions(obj[key]))
  }
  return obj
}

function removeDotTs(s: string) {
  const splitted = s.split('.')
  if (splitted.length > 1 && extensions.includes(splitted[splitted.length - 1]))
    splitted.pop()
  return splitted.join('.')
}

function getUnique(arry: string[]) {
  return [...new Set(arry)]
}


// For adapters type adaptor
function getDirectories(source: string) {
  return readdirSync(source, { withFileTypes: true })
    .map(dirent => dirent.name)
}

// Async version of getDirectories
async function getDirectoriesAsync(source: string): Promise<string[]> {
  const dirents = await readdir(source, { withFileTypes: true });
  return dirents.map(dirent => dirent.name);
}


async function runModule([name, func]: [string, () => Promise<void> | any]) {
  console.time(name)
  try {
    await func()
  } catch (e) {
    let eMessage = e instanceof Error ? e.message : e
    console.error(`Error processing function ${name}:`, eMessage)
  }
  console.timeEnd(name)
}