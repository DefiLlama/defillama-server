console.time('generate protocol imports')

async function run() {
  const files = ['data1.ts', 'data2.ts', 'data3.ts', 'data4.ts']
  const allProtocols: any[] = []
  const importPromises = files.map(async (file) => {
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