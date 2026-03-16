import { createCombinedHash, fileExists, readHashFromFile, writeFromCache, writeHashToFile, writeToCache } from "../../adaptors/utils"
import { DATA_FILES } from "../../constants"
import { sluggifyString } from "../../utils/sluggify"
const fs = require('fs')

console.time('generate protocol imports')
const outPath = __dirname + '/../../utils/imports/protocols.json'
const caterogiesOutPath = __dirname + '/../../utils/imports/categories.json'
const dataHash = createCombinedHash(DATA_FILES.map(f => __dirname + `/../${f}`))
const tvlHashKey = 'protocolImportsHash_' + dataHash


async function run() {
  const lastHash = readHashFromFile('data.ts')


  if (dataHash === lastHash && fileExists(outPath)) {
    console.log('No changes in data files, skipping protocol imports generation')
    return;
  }

  const usedCache = await writeFromCache(tvlHashKey, outPath, {
    successMessage: '[TVL] Using cached protocol imports, skipping generation',
    errorMessage: '[TVL] Error reading from cache, proceeding to generate protocol imports'
  })

  if (usedCache)
    return;


  // read all the data.ts files and create a combined import file
  // which a later js script will read and turn into json (and mock all the functions)
  const allProtocols: any[] = []
  const allCategories: any = {}
  const importPromises = DATA_FILES.map(async (file) => {
    const module = await import(`../${file}`)
    const protocolConfigs = module.default;
    allProtocols.push(...protocolConfigs);
    
    for (const protocolConfig of protocolConfigs) {
      const categories = protocolConfig.category ? [protocolConfig.category] : protocolConfig.tags;
      for (const c of categories) {
        const cSlug = sluggifyString(c);
        allCategories[cSlug] = allCategories[cSlug] || [];
        allCategories[cSlug].push(protocolConfig);
      }
    }
  })

  await Promise.all(importPromises)

  // write the generated imports file
  fs.writeFileSync(outPath, JSON.stringify(allProtocols))
  fs.writeFileSync(caterogiesOutPath, JSON.stringify(allCategories))

  // write the new hash
  writeHashToFile('data.ts', dataHash)

  // write to cache, so if some other folder in the same machine can use the same repo
  await writeToCache(tvlHashKey, allProtocols)
}

run().catch(console.error).then(() => {
  console.timeEnd('generate protocol imports')
  process.exit(0)
})