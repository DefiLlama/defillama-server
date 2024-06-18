import { elastic } from '@defillama/sdk'
import { Model, DataTypes } from 'sequelize'
import { initializeTVLCacheDB, closeConnection, getPGConnection, } from '../api2/db/index'

class TWITTER_TWEETS extends Model { }
class TWITTER_USERS extends Model { }

let esClient: any
let pgConnection: any

async function initPGTables() {
  TWITTER_USERS.init({
    handle: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    data: {
      type: DataTypes.JSON,
    },
  }, {
    sequelize: pgConnection,
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    tableName: 'twitter_users',
    indexes: [
      { name: 'twitter_handle_index', fields: ['handle'], },
    ]
  })

  TWITTER_TWEETS.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    data: {
      type: DataTypes.JSON,
    },
  }, {
    sequelize: pgConnection,
    timestamps: true,
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    tableName: 'twitter_tweets',
    indexes: [
      { name: 'tweets_id_index', fields: ['id'], },
    ]
  })

  // await pgConnection.sync()
}

async function initOnlyES() {
  if (!esClient)
    esClient = await elastic.getClient()
}


export async function init() {
  await initOnlyES()
  if (pgConnection) return;
  await initializeTVLCacheDB()
  pgConnection = getPGConnection()
  await initPGTables()
}

export async function close() {
  await esClient?.close()
  await closeConnection()
}

export async function updateUser(data: any) {
  // console.log('updating user', data)
  try {
    await esClient?.index({
      index: 'twitter_users',
      id: data.handle,
      body: data
    })
    await TWITTER_USERS.upsert({
      handle: data.handle,
      data
    })
  } catch (e) {
    console.error(e)
  }
}

export async function addTweet(id: any, data: any) {
  try {

    await esClient?.index({
      index: 'twitter_tweets-' + getYear(data),
      id,
      body: data
    })
    await TWITTER_TWEETS.upsert(data)
  } catch (e) {
    console.error(e)
  }
}

export async function addTweets(data: any) {
  if (!data.length) return;
  console.info('adding tweets', data.length, data[0].handle)
  try {
    // bulk insert in elastic
    const body = data.flatMap((doc: any) => {
      let _doc = { ...doc }
      return [{ index: { _index: 'twitter_tweets-' + getYear(doc), _id: _doc.id } }, _doc]
    })
    await esClient.bulk({ refresh: true, body })
    // bulk insert in postgres 
    // ignore duplicates and errors in bulk create
    const pgData = data.map((data: any) => ({ id: data.id, data, }))

    await TWITTER_TWEETS.bulkCreate(pgData, {
      updateOnDuplicate: ['data'],
    })
  } catch (e) {
    console.error(e)
  }
}

function getYear(tweetData: any) {
  try {
    return new Date(tweetData.time ?? tweetData.tweet_created_at).getFullYear()
  } catch (e) {
    return new Date().getFullYear()
  }

}

export async function getAllUsers() {
  const allResults: any = [];
  const scrollDuration = '1m'; // keep the search context open for 1 minute

  let searchResponse = await esClient?.search({
    index: 'twitter_users',
    scroll: scrollDuration,
    size: 9999,
    body: {
      query: {
        match_all: {},
      }
    }
  });

  while (true) {
    const result = searchResponse.hits.hits.map((hit: any) => hit._source)
    allResults.push(...result);

    if (result.length === 0) {
      break;
    }

    searchResponse = await esClient?.scroll({
      scroll_id: searchResponse._scroll_id,
      scroll: scrollDuration
    });
  }

  return allResults;
}

export async function getLastTweet(handle: string) {
  await initOnlyES()
  const response = await esClient?.search({
    index: 'twitter_tweets-*',
    body: {
      query: {
        match: {
          handle
        }
      },
      sort: [
        { time: { order: 'desc' } }
      ],
      size: 1
    }
  })
  return response.hits.hits[0]?._source
}

export async function getTweetStats(handle: string) {
  await initOnlyES()
  // return number of tweets per day for all time for given handle
  const response = await esClient?.search({
    index: 'twitter_tweets-*',
    body: {
      query: {
        match: {
          handle
        }
      },
      size: 0,
      aggs: {
        tweets_per_day: {
          date_histogram: {
            field: 'time',
            calendar_interval: 'day',
          }
        }
      }
    }
  })
  console.log(esClient, response)
  const buckets = response?.aggregations?.tweets_per_day?.buckets ?? []
  const res: {
    [date: number]: number
  } = {}
  buckets.forEach((bucket: any) => {
    if (bucket.doc_count > 0)
      res[Math.floor(bucket.key / 1e3)] = bucket.doc_count
  })
  return res
}
