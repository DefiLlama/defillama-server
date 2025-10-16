import * as sdk from "@defillama/sdk"
import allChains from '../../../defi/DefiLlama-Adapters/projects/helper/chains.json'
import axios from "axios";

const evmChains = allChains.filter((i: any) => {
  const provider = sdk.getProvider(i)
  // if (!provider) console.log(i, 'is not an evm chain')
  return !!provider
})

console.log('# of chains:', allChains.length)
console.log('# of evm chains:', evmChains.length)

async function run() {
  const nullAddress = '0x0000000000000000000000000000000000000000'

  const chunks = sdk.util.sliceIntoChunks(evmChains, 40)
  let missingTokens: string[] = []
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const tokens = chunk.map((i: any) => `${i}:${nullAddress}`)
    console.log('checking chunk', i + 1, 'of', chunks.length, '...')
    const res = (await axios.get('https://coins.llama.fi/prices/current/'+tokens.join(','))).data
    const missingInChunk = tokens.filter((k: string) => {
      // console.log(k, res.coins[k]?.symbol)
      return !res.coins[k]
    })
    console.log('# of missing tokens in this chunk:', missingInChunk.length)
    missingTokens.push(...missingInChunk)
  }
  console.log('ALL MISSING TOKENS:')
  console.log(JSON.stringify(missingTokens))
  console.table(missingTokens)
  console.log('# of missing tokens:', missingTokens.length)
}

run().catch(console.error).then(() => process.exit(0))