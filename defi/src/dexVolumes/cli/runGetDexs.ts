import "./setup.ts"
import { handler } from "../handlers/getDexs";

(async () => {
    const r = await handler()
    const rr = JSON.parse(r.body)
    console.log(rr)
})()