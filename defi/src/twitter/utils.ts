import axios from 'axios'

const twitterConfig = JSON.parse(process.env.TWITTER_CONFIG || '{}')

const twitterApi = axios.create({
  baseURL: twitterConfig.host,
  headers: {
    'Authorization': `Bearer ${twitterConfig.auth}`,
  }
})

export function transformTweet(tweet: any) {
  const response = {
    id: '' + tweet.id,
    text: tweet.message,
    time: +new Date(tweet.date),
    stats: tweet.stats,
    handle: tweet.author?.username.replace(/^\@/, '').split('@')[0],
  }

  return removeEmptyFields(response)
}

export function transformHandle(handle: any) {
  const { meta, } = handle
  const lastTweet = meta.lastTweet
  const minLastTweet = lastTweet ? {
    id: '' + lastTweet.id,
    text: lastTweet.text,
    time: +new Date(lastTweet.date),
  } : null

  const response = {
    ...meta,
    lastTweet: minLastTweet,
  }

  return removeEmptyFields(response)
}
export function transformHandleV2({ handleData = {}, lastTweet, user: _user, }: { user?: any, handleData?: any, lastTweet?: any }) {
  if (!lastTweet && !_user) return handleData
  let minLastTweet = {}
  if (lastTweet)
    minLastTweet = {
      id: '' + (lastTweet.id_str ?? lastTweet.id),
      text: lastTweet.full_text ?? lastTweet.text,
      time: +new Date(lastTweet.tweet_created_at ?? lastTweet.time),
    }
  let user = lastTweet?.user ?? _user
  const newData = user ? {
    id: user.id_str,
    name: user.name,
    // username: user.screen_name, // handle?
    protected: user.protected,
    verified: user.verified,
    location: user.location,
    site: user.url,
    followers: user.followers_count,
    following: user.friends_count,
    tweetCount: user.statuses_count,
    likes: user.favourites_count,
    listed: user.listed_count,
    joined: +new Date(user.created_at),
  } : {}

  const response = {
    ...handleData,
    ...newData,
    lastTweet: minLastTweet,
  }

  return removeEmptyFields(response)
}

export function transformTweetV2(tweet: any, handle: string) {
  const response = {
    id: '' + tweet.id,
    text: tweet.full_text,
    time: +new Date(tweet.tweet_created_at),
    stats: {
      retweets: tweet.retweet_count,
      likes: tweet.favorite_count,
      comments: tweet.reply_count,
      quotes: tweet.quote_count,
      views: tweet.views_count,
      bookmarks: tweet.bookmark_count,
    },
    handle,
    userId: tweet.user?.id_str,
    truncated: tweet.truncated,
  }
  return removeEmptyFields(response)
}

export function removeEmptyFields(obj: any) {
  if (obj === null || obj === undefined) {
    return obj
  }
  if (typeof obj !== 'object') return obj

  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => {
    if (!v) {
      return false
    }
    if (typeof v === 'object') removeEmptyFields(v)

    if (typeof v === 'string' && v.trim() === "")
      return false
    if (typeof v === 'object' && Object.keys(v).length === 0)
      return false
    if (Array.isArray(v) && v.length === 0)
      return false
    return true
  }))
}

export async function getUserData(handle: string) {
  try {
    const response = await twitterApi.get(`/user/${handle}`)
    return response.data
  } catch (e) {
    if (e.response) console.log(e.response.data)
    console.log('error while fetching user data: ', handle, e.toString())
    if (e.response.data) return e.response.data
    throw e
  }
}

export async function getAllTweets(handle: string, lastTweet?: any) {
  const allTweets: any = []
  let query_base = `from:${handle}  -filter:replies `
  const filter = lastTweet?.id ? ` since_id:${lastTweet.id}` : 'since_time:1705528240' // either based on last tweet or after 17-01-2024
  let cursor = undefined
  do {
    const { tweets, next_cursor } =( await twitterApi.get(`/search`, {
      params: {
        query: query_base + filter,
        cursor,
      }
    })).data

    allTweets.push(...tweets)
    cursor = next_cursor
    if (tweets.length < 19) cursor = undefined
    console.log(handle, tweets.length, cursor)
  } while (cursor)
  return allTweets.map((i: any) => transformTweetV2(i, handle))
}
