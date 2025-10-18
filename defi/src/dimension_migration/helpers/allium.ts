import retry from "async-retry";
import { IJSON } from "../adapters/types";
import { httpGet, httpPost } from "../utils/fetchURL";
import { getEnv } from "./env";
import plimit from "p-limit";
import { elastic } from "@defillama/sdk";

const _rateLimited = plimit(3)
const rateLimited = (fn: any) => (...args: any) => _rateLimited(() => fn(...args))

const token = {} as IJSON<string>

const HEADERS = {
  "Content-Type": "application/json",
  "X-API-KEY": getEnv('ALLIUM_API_KEY'),
};

export async function startAlliumQuery(sqlQuery: string) {
  const query = await httpPost(`https://api.allium.so/api/v1/explorer/queries/phBjLzIZ8uUIDlp0dD3N/run-async`, {
    parameters: {
      fullQuery: sqlQuery
    }
  }, {
    headers: HEADERS
  })

  return query["run_id"]
}

export async function retrieveAlliumResults(queryId: string) {
  const results = await httpGet(`https://api.allium.so/api/v1/explorer/query-runs/${queryId}/results?f=json`, {
    headers: HEADERS
  })
  return results.data
}

async function _queryAllium(sqlQuery: string) {
  let startTime = +Date.now() / 1e3

  const metadata: any = {
    application: "allium",
    query: sqlQuery,
    table: sqlQuery.split(/from/i)[1].split(/\s/)[1],
  }
  const API_KEY = HEADERS["X-API-KEY"]
  if (!API_KEY) {
    throw new Error("Allium API Key is required[Ignore this error for github bot]")
  }

  const _response = retry(
    async (bail) => {
      if (!token[sqlQuery]) {
        try {
          token[sqlQuery] = await startAlliumQuery(sqlQuery);
        } catch (e) {
          console.log("query run-async", e);
          throw e
        }
      }

      if (!token[sqlQuery]) {
        throw new Error("Couldn't get a token from allium")
      }

      const statusReq = await httpGet(`https://api.allium.so/api/v1/explorer/query-runs/${token[sqlQuery]}/status`, {
        headers: HEADERS
      })

      const status = statusReq
      if (status === "success") {
        return retrieveAlliumResults(token[sqlQuery])
      } else if (status === "failed") {
        console.log(`Query ${sqlQuery} failed`, statusReq.data)
        bail(new Error(`Query ${sqlQuery} failed, error ${JSON.stringify(statusReq.data)}`))
        return;
      }
      throw new Error("Still running")
    },
    {
      retries: 15,
      maxTimeout: 1000 * 60 * 2, // 2 minutes
      minTimeout: 1000 * 10, // 10 seconds
      randomize: true,
    }
  );

  let response;
  let success = false
  try {
    response = await _response
    success = true
    metadata.rows = response?.length
    let endTime = +Date.now() / 1e3
    await elastic.addRuntimeLog({ runtime: endTime - startTime, success, metadata, })
  } catch (e) {
    let endTime = +Date.now()
    await elastic.addRuntimeLog({ runtime: endTime - startTime, success, metadata, })
    await elastic.addErrorLog({ error: (e?.toString()) as any, metadata, })
    throw e
  }
  return response
}


export const queryAllium = rateLimited(_queryAllium);