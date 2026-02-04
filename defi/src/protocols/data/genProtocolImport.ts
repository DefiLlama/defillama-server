import { createCombinedHash, fileExists, readHashFromFile, writeFromCache, writeHashToFile, writeToCache } from "../../adaptors/utils"
import { DATA_FILES } from "../../constants"
const fs = require('fs')

console.time('generate protocol imports')
const outPath = __dirname + '/../../utils/imports/protocols.json'
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
  const importPromises = DATA_FILES.map(async (file) => {
    const module = await import(`../${file}`)
    allProtocols.push(...module.default)
  })

  await Promise.all(importPromises)

  // write the generated imports file
  fs.writeFileSync(outPath, JSON.stringify(allProtocols))

  // write the new hash
  writeHashToFile('data.ts', dataHash)

  // write to cache, so if some other folder in the same machine can use the same repo
  await writeToCache(tvlHashKey, allProtocols)
}

run().catch(console.error).then(() => {
  console.timeEnd('generate protocol imports')
  process.exit(0)
})