import "./setup.ts"
import { handler } from "../handlers/getDexs";

(async () => {
    const r = await handler()
    const rr = JSON.parse(r.body)
    console.log(rr.changeVolume1d)
    console.log(rr.changeVolume7d)
    console.log(rr.changeVolume30d)
})()