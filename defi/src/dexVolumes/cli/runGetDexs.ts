import "./setup.ts"
import { handler } from "../handlers/getDexs";

(async () => {
    const r = await handler()
    console.log(JSON.parse(r.body).dexs[0])
})()