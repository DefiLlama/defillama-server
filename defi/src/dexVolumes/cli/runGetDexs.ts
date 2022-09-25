import "./setup.ts"
import { handler, IGetDexsResponseBody } from "../handlers/getDexs";
import { APIGatewayProxyEvent } from "aws-lambda";

const event = {
    pathParameters: { chain: "bsc" }
} as unknown as APIGatewayProxyEvent

(async () => {
    const r = await handler(event)
    const rr = JSON.parse(r.body) as IGetDexsResponseBody
    console.log(rr.dexs.map(d=>[d.name, d.disabled]))
    /*     console.log("totalVolume", rr.totalVolume)
        console.log("changeVolume1d", rr.changeVolume1d)
        console.log("changeVolume7d", rr.changeVolume7d)
        console.log("changeVolume30d", rr.changeVolume30d) */
})()