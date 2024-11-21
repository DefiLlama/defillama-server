const cache = require('../utils/cache')
const { getTomlFile } = require('../utils/r2')

cache.clearTempFolders()

async function main() {
  const tomlFile = await getTomlFile()
  cache.writeJSON('tomlData.json', tomlFile, { compressed: false })
  process.exit(0)
}

main()
