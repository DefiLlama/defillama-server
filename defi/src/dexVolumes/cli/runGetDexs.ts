import "./setup.ts"
import { handler, IGetDexsResponseBody } from "../handlers/getDexs";

(async () => {
    const r = await handler()
    const rr = JSON.parse(r.body) as IGetDexsResponseBody
    delete rr.totalDataChart
    console.log(rr.dexs.find(dex=>dex.name.includes('Bancor')))
    /*     console.log("totalVolume", rr.totalVolume)
        console.log("changeVolume1d", rr.changeVolume1d)
        console.log("changeVolume7d", rr.changeVolume7d)
        console.log("changeVolume30d", rr.changeVolume30d) */
})()