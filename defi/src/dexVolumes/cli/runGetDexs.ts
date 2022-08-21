import "./setup.ts"
import { handler } from "../handlers/getDexs";

(async () => {
    const r = await handler()
    const rr = JSON.parse(r.body)
    console.log("totalVolume", rr.totalVolume)
    console.log("changeVolume1d", rr.changeVolume1d)
    console.log("changeVolume7d", rr.changeVolume7d)
    console.log("changeVolume30d", rr.changeVolume30d)
})()