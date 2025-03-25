import { chainConfigMap } from '@defillama/dimension-adapters/helpers/blockscoutFees'
import defillamaChains from '@defillama/adapters/projects/helper/chains.json'
import { PromisePool } from '@supercharge/promise-pool'

const axios = require('axios')

const chainlistURL = 'https://chainlist.org/rpcs.json'

const testWords = ['test', 'sepolia']
const skippedChainsSet = new Set([
  'base',
  'soneium',
  'ink',
])
const existingChainSet = new Set(defillamaChains)


async function main() {

  let { data: chainlist } = await axios.get(chainlistURL)
  chainlist = chainlist.filter((i: any) => {
    const { name, shortName, explorers = [] } = i
    i.explorers = explorers.filter((i: any) => !testWords.some((word: string) => i.url.includes(word)))
    if (!existingChainSet.has(shortName) || skippedChainsSet.has(shortName)) return false
    if (chainConfigMap[shortName]) {
      console.log(`Chain ${shortName} already exists in blockscoutFees`)
      return false
    }

    return i.explorers?.length > 0 && !testWords.some((word: string) => name.includes(word) || shortName.includes(word))
  })


  const filteredTable: any = []
  const filteredTable2: any = []
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toISOString().slice(0, "2011-10-05".length)

  await PromisePool.for(chainlist)
    .withConcurrency(31)
    .process(async (chain: any) => {
      // console.log('Processing', chain.shortName)
      // console.log(chain.explorers.map((i: any) => i.url))
      await Promise.all(chain.explorers.map(async (explorer: any) => {
        try {
          const url = `${explorer.url}/api?module=stats&action=totalfees&date=${yesterdayString}`
          const { data } = await axios.get(url)
          if (data.message !== 'OK') return;
          // console.log('Success', chain.shortName, url, data)
          filteredTable.push({ chain: chain.shortName, explorer: explorer.url })

          // now check if you can get all data
          const url2 = `${explorer.url}/assets/envs.js`
          const { data: data2 } = await axios.get(url2)
          if (!data2) return;
          // find line with "NEXT_PUBLIC_STATS_API_HOST" and extract value
          const statsApiHost = data2.split('\n').find((i: string) => i.includes('NEXT_PUBLIC_STATS_API_HOST'))
          if (!statsApiHost) return;
          const statsApiHostValue = statsApiHost.split('\"')[1].trim() ?? statsApiHost.split('\'')[1].trim()
          console.log('statsApiHostValue', statsApiHostValue, chain.shortName, explorer.url)
          const url3 = `${statsApiHostValue}/api/v1/lines/txnsFee?resolution=DAY`
          const { data: data3 } = await axios.get(url3)
          if (!data3) return;
          console.log('Success', chain.shortName, url3)
          filteredTable2.push({ chain: chain.shortName, explorer: explorer.url, allStatsApi: statsApiHostValue })
        } catch (e) {
          // console.log('Error', chain.shortName, explorer.url, e)
        }
      })
      )
      // console.log(chain)
    })

  console.table(filteredTable)
  console.table(filteredTable2)

  console.log(JSON.stringify(filteredTable))
  console.log(JSON.stringify(filteredTable2))

}

main().catch(console.error).then(() => process.exit(0))
