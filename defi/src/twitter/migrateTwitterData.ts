import { getTwitterData, getTwitterOverviewFile } from '../../dev-metrics/utils/r2'
import protocols from '../protocols/data'
import parentProtocols from '../protocols/parentProtocols'
import { chainCoingeckoIds } from '../utils/normalizeChain'
import { init, updateUser, addTweet, close, addTweets } from './db'
import { transformHandle, transformTweet } from './utils'

let twitterSet = new Set<string>()

const addTwitter = (i: any) => i.map((j: any) => {
  if (!j.twitter) return;
  if (Array.isArray(j.twitter)) j.twitter.forEach((k: any) => twitterSet.add(k))
  else twitterSet.add(j.twitter)
})

addTwitter(protocols)
addTwitter(parentProtocols)
addTwitter(Object.values(chainCoingeckoIds))

const twitterAccounts = Array.from(twitterSet)

async function run() {
  const overviewFile = await getTwitterOverviewFile()

  await init()

  const totalHandles = Object.keys(overviewFile).length

  let i = 0
  for (const handle of Object.keys(overviewFile)) {
    if (handle !== 'Governor_DAO') return;
    if (!twitterAccounts.includes(handle)) {
      continue
    }

    try {
      i++

      if (!overviewFile[handle].meta.handle) {
        // console.log('No data found for', handle)
        continue
      }

      const data = transformHandle(overviewFile[handle])
      data.handle = handle
      await updateUser(data)
      const tweetData = await getTwitterData(handle)
      if (!tweetData.tweets.length) continue
      if (i % 10 === 0)
        console.log(i, totalHandles, handle, tweetData.tweets.length)
      await addTweets(tweetData.tweets.map(transformTweet))
    } catch (e) {
      console.error(e)
    }

  }
}

run().catch(console.error).then(async () => {
  await close()
  process.exit(0)
})
