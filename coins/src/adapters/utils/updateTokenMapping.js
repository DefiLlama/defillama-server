const fs = require('fs')
const tmFile = __dirname + '/../tokenMapping.json'
const coreAssetsFile = __dirname + '/../../../../defi/DefiLlama-Adapters/projects/helper/coreAssets.json'
const tokenMappings = require(tmFile)
const tokenMappingsAdded = require('../tokenMapping_added.json')
const coreAssets = require(coreAssetsFile)
const { fixBalancesTokens, } = require('../../../../defi/DefiLlama-Adapters/projects/helper/tokenMapping.js')
const sdk = require('@defillama/sdk')

async function run() {
  for (const [chain, mappings] of Object.entries(fixBalancesTokens)) {
    const api = new sdk.ChainApi({ chain })
    const chainTokenMapping = tokenMappings[chain] ?? {}
    const existingTokens = Object.keys(chainTokenMapping).concat(Object.keys(tokenMappingsAdded[chain] ?? [])).map(i => i.toLowerCase())
    const existingTokensSet = new Set(existingTokens)
    const coreTokenMapping = coreAssets[chain] ?? {}
    const processedSet = new Set()
    for (const [token, { coingeckoId, decimals }] of Object.entries(mappings)) {
      const normalizedLabel = token.toLowerCase()
      if (processedSet.has(normalizedLabel)) continue;
      processedSet.add(normalizedLabel)
      if (existingTokensSet.has(normalizedLabel)) {
        console.log('Already have mapping for: ', chain, token)
        continue;
      }
      let symbol = ''

      try {
        symbol = await api.call({ abi: 'string:symbol', target: token })
      } catch (e) {
        console.log('unable to fetch symbol for ', chain, token)
        symbol = token
      }
      chainTokenMapping[token] = { to: `coingecko#${coingeckoId}`, decimals, symbol }
      let i = 0
      label = symbol
      while (coreTokenMapping[label] && coreTokenMapping[label].toLowerCase() !== normalizedLabel) {
        label = `${symbol}_${++i}`
      }
      coreTokenMapping[label] = token
    }

    if (Object.keys(chainTokenMapping).length)
      tokenMappings[chain] = chainTokenMapping
    if (Object.keys(coreTokenMapping).length)
      coreAssets[chain] = coreTokenMapping
  }

  fs.writeFileSync(tmFile, JSON.stringify(tokenMappings, null, 2))
  fs.writeFileSync(coreAssetsFile, JSON.stringify(coreAssets, null, 2))
}

run().catch(console.error).then(() => {
  console.log('done')
  process.exit(0)
})