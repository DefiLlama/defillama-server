import { get } from 'lodash'
import protocols from '../protocols/data'
import parentProtocols from '../protocols/parentProtocols'
import { chainCoingeckoIds } from '../utils/normalizeChain'
import { init, close, getAllUsers, updateUser, addTweets, } from './db'
import { getAllTweets, getUserData, transformHandleV2 } from './utils'
import sleep from '../utils/shared/sleep'
import { setTwitterOverviewFileV2 } from '../../dev-metrics/utils/r2'

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

console.log('twitterAccounts: ', twitterAccounts.length)

async function run() {
  await init()
  const users = await getAllUsers()
  console.log('users: ', users.length)
  const userMap: any = {}
  users.forEach((i: any) => userMap[i.handle] = i)
  let i = 0

  for (const handle of twitterAccounts) {
    // for (const handle of ['DraculaProtocol', 'WrappedBTC', 'PhoenixTrade']) {
    i++
    try {
      let userData = userMap[handle]
      if (userData?.errorMessage === 'Insufficient balance') {
        delete userData.errorV2
        delete userData.errorMessage
        console.info('removing error because of insufficient balance: ', handle)
      }
      if ((!userData || !userData.lastPullV2) && !userData?.errorV2) {
        const preUpdate = userData
        userData = await getUserData(handle)
        userData.handle = handle
        if (userData.status === 'error') {
          userData.errorMessage = userData.message
          userData.errorV2 = true
          delete userData.status
          delete userData.message
          userMap[handle] = userData
          await updateUser(userData)
          console.log('error while fetching user data: ', handle, userData.errorMessage)
          continue
        }
        userData = transformHandleV2({ user: userData, handleData: preUpdate })
      }

      if (userData.errorV2) continue; // probably user not found, no point in contiuining

      if (skipTweetPull(userData)) {
        // console.log('skipping tweets for: ', handle)
        continue
      }
      userMap[handle] = userData

      console.log(i, '/', twitterAccounts.length, 'updating user: ', handle)
      const tweets = await getAllTweets(handle, userData.lastTweet)
      tweets.sort((a: any, b: any) => b.time - a.time)

      const lastTweet = tweets[0]
      userData = transformHandleV2({ handleData: userData, lastTweet, })

      userData.lastPullV2 = +new Date()
      userData.handle = handle
      const missingHandle = tweets.filter((i: any) => !i.handle)
      if (missingHandle.length) {
        console.log('missing handle in tweets: ', handle, missingHandle)
        throw new Error('missing handle in tweets')
      }

      await addTweets(tweets)
      await updateUser(userData)

      // avoid hitting rate limit
      await sleep(1000)

    } catch (e) {
      console.log('error while updating tweets: ', handle)
      console.error(e)
    }
  }

  await setTwitterOverviewFileV2(userMap)
}

run().catch(console.error).then(async () => {
  await close()
  process.exit(0)
})


function skipTweetPull(userData: any) {
  if (!userData.lastPullV2) return false // never queried using new api

  const lastPull = new Date(userData.lastPullV2)
  const oneDay = 24 * 60 * 60 * 1000
  const timeDiff = +new Date() - +lastPull
  const monthAgo = +new Date(+new Date() - 30 * oneDay)

  // check if last pull was less than 48 hours ago
  if (timeDiff < 2 * oneDay)
    return true

  if (!userData?.lastTweet?.time)  // no tweets found, then we check once a month
    return timeDiff < monthAgo

  const lastTweetDate = +new Date(userData?.lastTweet?.time ?? new Date())
  if (lastTweetDate > monthAgo) return timeDiff < monthAgo // if last tweet was more than a month ago, then we check once a month
}
