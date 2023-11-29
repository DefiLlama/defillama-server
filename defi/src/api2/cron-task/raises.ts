import { storeRouteData, } from "../cache/file-cache";
import { getRaisesInternal } from "../../getRaises";
import { getHacksInternal } from "../../getHacks";

async function run() {

  await writeRaises()
  await writeHacks()

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
}

run().catch(console.error).then(() => process.exit(0))