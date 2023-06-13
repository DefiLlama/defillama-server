const sdk = require('@defillama/sdk')
const { TWITTER_MAPPING } = require('../utils')
const { getHandleDetails } = require('../utils/twitter')
const {
  getTwitterData,
  saveTwitterData,
  getTwitterOverviewFile,
  setTwitterOverviewFile,
} = require('../utils/r2')

async function main() {
  const handles = [...new Set(Object.values(TWITTER_MAPPING))]
  let checked = 0

  // const twitterOverview = await getTwitterOverviewFile()
  console.log(twitterOverview)
  const twitterOverview = {}
  const TWELVE_HOURS = 12 * 60 * 60 * 1000
  for (const handle of handles) {
    const handleMetadata = twitterOverview[handle] || {}
    checked++
    const oldData = await getTwitterData(handle)
    // let oldData = {}
    if (handleMetadata.ignore || (oldData.notFound || oldData.suspended)) continue;
    // if ((handleMetadata.updatedAt && +Date.now() - handleMetadata.updatedAt < TWELVE_HOURS)) {
    //   sdk.log(`Skipping ${handle} because it was updated less than 12 hours ago`)
    //   continue
    // }

    let data = oldData
    if (!oldData.updatedAt || +Date.now() - oldData.updatedAt > TWELVE_HOURS) {
      data = await getHandleDetails(handle)
      console.log(data)
    }
    const mergedTweets = mergeTweets(oldData.tweets, data.tweets)
    data = { ...oldData, ...data, tweets: mergedTweets }
    twitterOverview[handle] = {
      updatedAt: +Date.now(),
      ignore: data.notFound || data.suspended,
      meta: {
        tweetCount: data.tweetCount,
        following: data.following,
        followers: data.followers,
        likes: data.likes,
        joined: data.joined,
        site: data.site,
        handle: data.handle,
      }
    }


    sdk.log(`${checked}/${handles.length} Updated ${handle} `, twitterOverview[handle].ignore, data?.tweets?.length)
    await saveTwitterData(handle, data)
    // if (checked % 10 === 0) {
      // sdk.log(`Saving twitter overview file`)
      await setTwitterOverviewFile(twitterOverview)
    // }
  }
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

async function test() {
  const handle = 'wrappedbtc'
  const data = await getHandleDetails(handle)
  console.log(data.tweets.length)
  await saveTwitterData(handle, data)
}

test().catch(console.error).then(() => process.exit(0))
