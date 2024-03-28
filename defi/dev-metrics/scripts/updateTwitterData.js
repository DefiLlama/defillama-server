const sdk = require('@defillama/sdk')
const { TWITTER_MAPPING } = require('../utils')
const { getHandleDetails } = require('../utils/twitter')
const {
  getTwitterData,
  saveTwitterData,
  getTwitterOverviewFile,
  setTwitterOverviewFile,
  testFetchWithoutCache,
} = require('../utils/r2')

async function main() {
  const handles = [...new Set(Object.values(TWITTER_MAPPING))].reverse()
  let checked = 0
  let i = 0
  const twitterOverview = await getTwitterOverviewFile()

  // const twitterOverview = {}
  const TWELVE_HOURS = 12 * 60 * 60 * 1000 * 7 * 2
  let connectionRefusedCount = 0
  for (const handle of handles) {
    const handleMetadata = twitterOverview[handle] || {}
    checked++
    if (connectionRefusedCount > 5 || handleMetadata.ignore) continue;
    if ((handleMetadata.updatedAt && +Date.now() - handleMetadata.updatedAt < TWELVE_HOURS)) {
      // sdk.log(`[Twitter] Skipping ${handle} because it was updated less than ${(TWELVE_HOURS/ (36 *1e5)).toFixed(2)} hours ago`)
      continue
    }

    // let oldData = {}
    let oldData = await getTwitterData(handle)

    if (oldData.tweets && !oldData.tweets[0]?.id)
      oldData = {} // data is in outdated format, so we need to re-fetch it
    let data = oldData

    try {

      if ((!oldData.updatedAt || +Date.now() - oldData.updatedAt > TWELVE_HOURS) && !oldData.notFound && !oldData.suspended) {
        const tweetSet = new Set(oldData.tweets?.map(t => t.id))
        data = await getHandleDetails(handle, tweetSet)
        const mergedTweets = mergeTweets(oldData.tweets, data.tweets)
        data = { ...oldData, ...data, tweets: mergedTweets }
      } else {
        // sdk.log(`[Twitter] Skipping ${handle} because it was updated less than 12 hours ago[data]`)
        ++i;
        continue;
      }

      await saveTwitterData(handle, data)

    } catch (e) {
      sdk.log(`[Twitter] Error fetching ${handle}`, e.toString())
      if (e.toString().includes('ECONNREFUSED') || e.toString().includes('ETIMEDOUT')) {
        connectionRefusedCount++
        continue;
      }
    }

    twitterOverview[handle] = {
      updatedAt: +Date.now(),
      ignore: data.notFound || data.suspended,
      meta: {
        lastTweet: getLatestTweet(data.tweets),
        tweets2: data.tweets?.length,
        tweetCount: data.tweetCount,
        following: data.following,
        followers: data.followers,
        likes: data.likes,
        joined: data.joined,
        site: data.site,
        handle: data.handle,
      }
    }
    const progress = Number(100 * checked / handles.length).toPrecision(5)
    sdk.log(`[Twitter] ${++i} Updated ${handle} `, twitterOverview[handle]?.ignore, data?.tweets?.length, `(${progress}%) (${checked}/${handles.length})`)
    // console.log(twitterOverview, data)

    // process.exit(0)
    if (checked % 42 === 0) {
      sdk.log(`Saving twitter overview file`)
      await setTwitterOverviewFile(twitterOverview)
    }
  }
  await setTwitterOverviewFile(twitterOverview)
}

function mergeTweets(...tweetsArray) {
  const obj = {}
  for (const tweets of tweetsArray) {
    if (!tweets || !tweets.length) continue
    for (const tweet of tweets) {
      obj[tweet.id] = tweet
    }
  }
  return Object.values(obj)
}

function getLatestTweet(tweets = []) {
  // Sort the array in descending order based on the "date" field
  tweets.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Get the latest data (first element after sorting)
  return tweets[0] ?? {}
}

async function test() {
  const handle = 'logarithm_fi'
  // console.log(JSON.stringify(await testFetchWithoutCache('twitter', 'iearnfinance'), null, 2))

  const data = await getHandleDetails(handle)
  console.log(handle, data.tweets?.length)
  // await saveTwitterData(handle, data) 
}

main().catch(console.error).then(() => process.exit(0))
// test().catch(console.error).then(() => process.exit(0))
