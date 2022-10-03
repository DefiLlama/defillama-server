import "./setup.ts"
import { handler } from "../handlers/getDexVolume";

(async () => {
    const r = await handler({
        pathParameters: {
            dex: "pancakeswap"
        }
    } as unknown as AWSLambda.APIGatewayEvent)
    const d = JSON.parse(r.body)
    console.log(d.volumeHistory.find((v:any)=>v.timestamp===1600387200))
    //console.log(JSON.stringify(d, null, 2))
})()