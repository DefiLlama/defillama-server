import { createCombinedHash, fileExists, readHashFromFile, writeHashToFile } from "../../adaptors/utils"
import { DATA_FILES } from "../../constants"

console.time('generate protocol imports')
const outPath = __dirname + '/../../utils/imports/protocols.json'

async function createProtocolImports() {
  const allProtocols: any[] = []
  const importPromises = DATA_FILES.map(async (file) => {
    const module = await import(`../${file}`)
    allProtocols.push(...module.default)
  })
  await Promise.all(importPromises)
  const fs = require('fs')
  fs.writeFileSync(outPath, JSON.stringify(allProtocols))
}

async function run() {
  const dataHash = createCombinedHash(DATA_FILES.map(f => __dirname + `/../${f}`))
  const lastHash = readHashFromFile('data.ts')
  if (dataHash === lastHash && fileExists(outPath)) {
    console.log('No changes in data files, skipping protocol imports generation')
  } else {
    await createProtocolImports()
    writeHashToFile('data.ts', dataHash)
  }

  console.timeEnd('generate protocol imports')
}

run().catch(console.error).then(() => process.exit(0))