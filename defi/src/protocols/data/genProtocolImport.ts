import { DATA_FILES } from "../../constants"

console.time('generate protocol imports')

async function run() {
  const allProtocols: any[] = []
  const importPromises = DATA_FILES.map(async (file) => {
    const module = await import(`../${file}`)
    allProtocols.push(...module.default)
  })
  await Promise.all(importPromises)
  const outPath = __dirname + '/../../utils/imports/protocols.json'
  const fs = require('fs')
  fs.writeFileSync(outPath, JSON.stringify(allProtocols))
  console.timeEnd('generate protocol imports')
}

run().catch(console.error).then(() => process.exit(0))