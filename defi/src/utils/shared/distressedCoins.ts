import { elastic, } from "@defillama/sdk";

export async function isDistressed(key: string) {
  // NO: this needs to check in our ddb or coins db to see if a given key is distressed, or maybe we can get that info from coins.llama.fi?
}

export async function logDistressedCoins(keys: any[],) {
  for (const data of keys) {
    data.reportTime = Math.floor(Date.now() / 1000)
    await elastic.writeLog("distressed-assets", data);
  } 
}

// get list of possible distressed coins from ES logs in the last week
export async function readDistressedLogs() {
  const esClient = elastic.getClient();
  const aWeekAgo = Math.floor(Date.now() / 1000) - 3600 * 24 * 7;

  let {
    hits: { hits },
  }: any = await esClient?.search({
    index: "distressed-assets*",
    size: 999,
    body: {
      query: {
        range: {
          // find records with reportTime > lastCheckTS
          reportTime: {
            gt: aWeekAgo, // reportTime is in ms
          },
        },
      },
    },
  })
  return hits.map((hit: any) => hit._source);
}