import { IJSON } from "../adapters/types";
import { httpPost } from "../utils/fetchURL";
import { getEnv } from "./env";

const token = {} as IJSON<string>
const isRestrictedMode = getEnv('FLIPSIDE_RESTRICTED_MODE') === 'true'
const FLIPSIDE_API_KEYS = getEnv('FLIPSIDE_API_KEY')?.split(',') ?? ["f3b65679-a179-4983-b794-e41cf40103ed"]
let API_KEY_INDEX = 0;

type IRequest = {
  [key: string]: Promise<any>;
}
const query: IRequest = {};

async function randomDelay() {
  const delay = Math.floor(Math.random() * 5) + 2
  return new Promise((resolve) => setTimeout(resolve, delay * 1000))
}

export async function queryFlipside(sqlQuery: string, maxAgeMinutes: number = 90) {
  checkCanFlipSideQuery();
  if (!query[sqlQuery]) {
    query[sqlQuery] =  _queryFlipside(sqlQuery, maxAgeMinutes);
  }
  return query[sqlQuery];
}
let FLIPSIDE_API_KEY: string = FLIPSIDE_API_KEYS[API_KEY_INDEX]

function switchToNextAPIKey(e: any, callback: any) {
  if(e?.response?.statusText === 'Payment Required' || e?.response?.statusText === 'Unauthorized') {
    if (API_KEY_INDEX < (FLIPSIDE_API_KEYS.length-1)) {
      API_KEY_INDEX++;
      FLIPSIDE_API_KEY = FLIPSIDE_API_KEYS[API_KEY_INDEX];
      console.info(`Switching to new API key: ${FLIPSIDE_API_KEY}`);
      return callback()
    } else {
      const error = new Error(`Payment Required`)
      throw error;
    }
  }
  throw e;
}

// query status
async function createRequire(sqlQuery: string, maxAgeMinutes: number): Promise<string | undefined> {
  try {
      const query = await httpPost("https://api-v2.flipsidecrypto.xyz/json-rpc",
      {
        "jsonrpc": "2.0",
        "method": "createQueryRun",
        "params": [
            {
                "resultTTLHours": 5,
                "maxAgeMinutes": maxAgeMinutes,
                "sql": sqlQuery,
                "tags": {
                  "source": "api"
                },
                "dataSource": "snowflake-default",
                "dataProvider": "flipside"
            }
        ],
        "id": 1
    }, {
        headers: {
          'x-api-key': FLIPSIDE_API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        },
      }, { withMetadata: true })

      if(query?.result?.queryRun?.id){
        return query?.result.queryRun.id
      } else {
        console.log("error query data", query)
        throw query?.error.message
      }

  } catch (e: any) {
    return switchToNextAPIKey(e, () => createRequire(sqlQuery, maxAgeMinutes))
  }
}

// query status
async function queryStatus(queryID: string) {
  try {
    const _queryStatus = await httpPost(`https://api-v2.flipsidecrypto.xyz/json-rpc`, {
      "jsonrpc": "2.0",
      "method": "getQueryRun",
      "params": [
        {
          "queryRunId": queryID
        }
      ],
      "id": 1
    }, {
      headers: {
        'x-api-key': FLIPSIDE_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    }, { withMetadata: true })
    const status = _queryStatus.result.queryRun.state
    if (status === "QUERY_STATE_SUCCESS") {
      return _queryStatus
    } else if (status === "QUERY_STATE_FAILED") {
      console.log(`Flipside query ${queryID} failed`, _queryStatus)
      return _queryStatus
    }
    console.info(`Flipside query ${queryID} status: ${status}`)
    await randomDelay()
    return queryStatus(queryID)
  } catch (e: any) {
    return switchToNextAPIKey(e, () => queryStatus(queryID))
  }
}

async function cancelQuery(queryID: string) {
  await httpPost(`https://api-v2.flipsidecrypto.xyz/json-rpc`, {
    "jsonrpc": "2.0",
    "method": "cancelQueryRun",
    "params": [
        {
          "queryRunId": queryID
        }
    ],
    "id": 1
  }, {
    headers: {
      'x-api-key': FLIPSIDE_API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    },
  }, { withMetadata: true })
}

// query results
async function queryResults(queryID: string) {
  try {
    let fullRows:any[] = []
    let pageNum = 1;
    let maxPages = 1;
    while(pageNum <= maxPages){
      const results = await httpPost(`https://api-v2.flipsidecrypto.xyz/json-rpc`, {
        "jsonrpc": "2.0",
        "method": "getQueryRunResults",
        "params": [
          {
            "queryRunId": queryID,
            "format": "csv",
            "page": {
              "number": pageNum,
              "size": 5000
            }
          }
        ],
        "id": 1
      }, {
        headers: {
          'x-api-key': FLIPSIDE_API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
      }, { withMetadata: true })
      if(results.result.rows === null){
        return [] // empty result
      }
      pageNum = results.result.page.currentPageNumber + 1;
      maxPages = results.result.page.totalPages;
      fullRows = fullRows.concat(results.result.rows.map((t: any[]) => t.slice(0, -1)))
    }
    return fullRows
  } catch (e: any) {
    return switchToNextAPIKey(e, () => queryResults(queryID))
  }
}

const _queryFlipside = async (sqlQuery: string, maxAgeMinutes: number) => {
  if (!token[sqlQuery]) {
    const query = await createRequire(sqlQuery, maxAgeMinutes)
    if (query) {
      token[sqlQuery] = query
    }
  }

  if (!token[sqlQuery]) {
    throw new Error("Couldn't get a token from flipsidecrypto")
  }

  const _queryStatus = await queryStatus(token[sqlQuery])
  const status = _queryStatus.result.queryRun.state
  if (status === "QUERY_STATE_SUCCESS") {
    try {
      return queryResults(token[sqlQuery])
    } catch (e) {
      console.log("flipside query results", e);
      throw e
    }
  } else if (status === "QUERY_STATE_FAILED") {
    await cancelQuery(token[sqlQuery])
  }
}

export function checkCanFlipSideQuery() {
  if (!isRestrictedMode) return;
  const currentHour = new Date().getUTCHours();
  if (currentHour >= 1 && currentHour <= 3) return; // 1am - 3am - any time other than this, throw error
  throw new Error(`Current hour is ${currentHour}. In restricted mode, can run flipsside queries only between 1am - 3am UTC`);
}
