import { storeRouteData, } from "../cache/file-cache";
import { getRaisesInternal } from "../../getRaises";
import { getHacksInternal } from "../../getHacks";
// import { fetchArticles } from "../../getNewsArticles";

async function run() {

  await writeRaises()
  await writeHacks()
  // await writeArticles()

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

run().catch(console.error).then(() => process.exit(0))