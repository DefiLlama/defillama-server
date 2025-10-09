import { storeRouteData, } from "../cache/file-cache";
import { getRaisesInternal } from "../../getRaises";
import { getHacksInternal } from "../../getHacks";
// import { fetchArticles } from "../../getNewsArticles";
import * as sdk from '@defillama/sdk'
import { runWithRuntimeLogging } from "../utils";


async function run() {
  const { lastUpdateTS } = (await sdk.cache.readExpiringJsonCache('cron-task/raises-last-update')) ?? { lastUpdateTS: 0 }
  const now = Date.now()
  // only run if last update was more than 2 hours ago
  if (now - lastUpdateTS < 2 * 60 * 60 * 1000) {
    console.log('Last raises data pull was less than 2 hours ago, skipping')
    return
  }


  await writeRaises()
  await writeHacks()
  // await writeArticles()

  await sdk.cache.writeExpiringJsonCache('cron-task/raises-last-update', { lastUpdateTS: now }, { expireAfter: 24 * 60 * 60 * 1000 }) // expire after 24 hours

  async function writeRaises() {
    console.time('write /raises')
    const data = await getRaisesInternal()
    await storeRouteData('raises', data)
    console.timeEnd('write /raises')
  }

  async function writeHacks() {
    console.time('write /hacks')
    const data = await getHacksInternal()
    await storeRouteData('hacks', data)
    console.timeEnd('write /hacks')
  }

  /* async function writeArticles() {
    console.time('write /news/articles')
    const data = await fetchArticles()
    await storeRouteData('news/articles', data)
    console.timeEnd('write /news/articles')
  } */
}


runWithRuntimeLogging(run, {
  application: "cron-task",
  type: 'raises',
}).catch(console.error).then(() => process.exit(0))

setTimeout(() => {
  console.log('Running for more than 5 minutes, exiting.');
  process.exit(1);
}, 5 * 60 * 1000) // keep process alive for 5 minutes in case of hanging promises