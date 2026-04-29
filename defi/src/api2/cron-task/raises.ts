import { getRaisesInternal } from "../routes/getRaises";
import { getHacksInternal } from "../routes/getHacks";
import { getTokenRightsInternal } from "../routes/getTokenRights";
import { fetchArticles } from "../utils/newsArticles";
import * as sdk from "@defillama/sdk";

async function run() {
  const dataMappings: any = {
    raises: getRaisesInternal,
    hacks: getHacksInternal,
    "token-rights": getTokenRightsInternal,
    "news/articles": fetchArticles,
  }

  for (const [key, fetcher] of Object.entries(dataMappings)) {
    try {
      console.time(`fetch ${key}`)
      const data = await (fetcher as any)()
      await sdk.cache.writeCache(`cron-task/${key}`, data, {
        skipCompression: true, 
      })

      console.timeEnd(`fetch ${key}`)
    } catch (e) {
      console.log(`Failed to fetch/write ${key}, skipping:`, e)
    }
  }
}

run().catch(console.log).then(() => process.exit(0))
