import protocols from '../protocols/data'
import parentProtocols from '../protocols/parentProtocols'
import { chainCoingeckoIds } from '../utils/normalizeChain'
import { init, close, getAllUsers, updateUser, addTweets, } from './db'
import { fetchBatchTweets, getUserData, transformHandleV2, transformTweetV2 } from './utils'
import sleep from '../utils/shared/sleep'
import { setTwitterOverviewFileV2 } from '../../dev-metrics/utils/r2'
import axios from 'axios'

let twitterSet = new Set<string>()
const protocolDataMap: any = {}
const handlesOver1MTvl = new Set<string>()
const handlesOver50kTvl = new Set<string>()

function addTwitter(i: any) {
  i.map((j: any) => {
    const { tvl, deadFrom } = protocolDataMap[j.id] ?? {}
    if (!j.twitter || deadFrom) return;
    const handles = Array.isArray(j.twitter) ? j.twitter : [j.twitter]
    if (tvl && tvl > 5e4) {
      if (tvl > 1e6) handles.forEach((k: any) => handlesOver1MTvl.add(k))
      else handles.forEach((k: any) => handlesOver50kTvl.add(k))
    }

    handles.forEach((k: any) => twitterSet.add(k))
  })

}

const oneDay = 24 * 60 * 60 * 1000
const BATCH_SIZE = 20
const THIRTY_DAYS_S = Math.floor(30 * oneDay / 1000)

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size)
    chunks.push(arr.slice(i, i + size))
  return chunks
}

function shouldSkip(userData: any, waitTime: number): boolean {
  if (!userData?.lastPullV2) return false
  return (+new Date() - userData.lastPullV2) < waitTime
}

async function run() {

  const { data: protocolData } = await axios.get('https://api.llama.fi/protocols')
  protocolData.forEach((i: any) => protocolDataMap[i.id] = i)

  addTwitter(protocols)
  addTwitter(parentProtocols)
  addTwitter(Object.values(chainCoingeckoIds))

  const twitterAccounts = Array.from(twitterSet)

  console.log('twitterAccounts: ', twitterAccounts.length)
  console.log('handlesOver1MTvl: ', handlesOver1MTvl.size)
  console.log('handlesOver50kTvl: ', handlesOver50kTvl.size)

  await init()
  const users = await getAllUsers()
  console.log('users: ', users.length)
  const userMap: any = {}
  users.forEach((i: any) => userMap[i.handle] = i)

  const handlesUnder50k = twitterAccounts.filter(h => !handlesOver1MTvl.has(h) && !handlesOver50kTvl.has(h))
  const tiers = [
    { handles: [...handlesOver1MTvl], waitTime: 2 * oneDay, label: '>1M TVL' },
    { handles: [...handlesOver50kTvl], waitTime: 4 * oneDay, label: '>50k TVL' },
    { handles: handlesUnder50k, waitTime: 8 * oneDay, label: '<50k TVL' },
  ]

  for (const tier of tiers) {
    const handlesToFetch = tier.handles.filter(handle => {
      const userData = userMap[handle]
      if (userData?.errorMessage === 'Insufficient balance') {
        delete userData.errorV2
        delete userData.errorMessage
      }
      if (userData?.errorV2) return false
      return !shouldSkip(userData, tier.waitTime)
    })

    console.log(`\n[${tier.label}] ${handlesToFetch.length}/${tier.handles.length} handles need update`)
    if (!handlesToFetch.length) continue

    const chunks = chunkArray(handlesToFetch, BATCH_SIZE)

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]
      try {
        const now = Math.floor(Date.now() / 1000)
        const defaultSince = now - THIRTY_DAYS_S
        const sinceTime = chunk.reduce((min, handle) => {
          const pullTime = userMap[handle]?.lastPullV2
          if (!pullTime) return min
          const pullSec = Math.floor(pullTime / 1000)
          return pullSec < min ? pullSec : min
        }, defaultSince)

        console.log(`[${tier.label}] batch ${ci + 1}/${chunks.length} (${chunk.length} handles, since: ${new Date(sinceTime * 1000).toISOString()})`)

        const { tweets: rawTweets, truncated } = await fetchBatchTweets(chunk, sinceTime)
        if (truncated) console.log(`batch truncated at maxPages, will retry next run`)

        const tweetsByHandle = new Map<string, any[]>()
        const handleLookup = new Map<string, string>()
        chunk.forEach(h => handleLookup.set(h.toLowerCase(), h))

        for (const tweet of rawTweets) {
          const screenName = tweet.user?.screen_name
          if (!screenName) continue
          const original = handleLookup.get(screenName.toLowerCase()) || screenName
          if (!tweetsByHandle.has(original)) tweetsByHandle.set(original, [])
          tweetsByHandle.get(original)!.push(tweet)
        }

        const allTransformed: any[] = []
        for (const [handle, tweets] of tweetsByHandle) {
          tweets.sort((a: any, b: any) => new Date(b.tweet_created_at).getTime() - new Date(a.tweet_created_at).getTime())
          const transformed = tweets.map(t => transformTweetV2(t, handle))
          allTransformed.push(...transformed)
        }

        if (allTransformed.length) {
          await addTweets(allTransformed)
          console.log(`  stored ${allTransformed.length} tweets from ${tweetsByHandle.size} handles`)
        }

        if (!truncated) {
          for (const [handle, tweets] of tweetsByHandle) {
            const latestTweet = tweets[0]
            let userData = userMap[handle] || {}
            userData = transformHandleV2({ handleData: userData, lastTweet: latestTweet, user: latestTweet.user })
            userData.lastPullV2 = +new Date()
            userData.handle = handle
            userMap[handle] = userData
            await updateUser(userData)
          }
        }

        const handlesWithTweets = new Set([...tweetsByHandle.keys()].map(h => h.toLowerCase()))
        const zeroTweetHandles = chunk.filter(h => !handlesWithTweets.has(h.toLowerCase()))

        for (const handle of zeroTweetHandles) {
          try {
            const rawUser = await getUserData(handle)
            if (rawUser.status === 'error') {
              const userData = { handle, errorV2: true, errorMessage: rawUser.message }
              userMap[handle] = userData
              await updateUser(userData)
              console.log(`  error for ${handle}: ${rawUser.message}`)
              continue
            }
            let userData = userMap[handle] || {}
            userData = transformHandleV2({ user: rawUser, handleData: userData })
            userData.lastPullV2 = +new Date()
            userData.handle = handle
            userMap[handle] = userData
            await updateUser(userData)
          } catch (e) {
            console.log(`  error fetching user data for ${handle}:`, e)
          }
        }

        if (zeroTweetHandles.length)
          console.log(`  ${zeroTweetHandles.length} handles had no tweets, fetched user data individually`)

        await sleep(200)
      } catch (e) {
        console.log(`[${tier.label}] error in batch ${ci + 1}:`, e)
      }
    }
  }

  await setTwitterOverviewFileV2(userMap)
}

run().catch(console.error).then(async () => {
  await close()
  process.exit(0)
})
