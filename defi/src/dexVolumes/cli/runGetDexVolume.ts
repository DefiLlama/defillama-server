import "./setup.ts"
import { handler } from "../handlers/getDexVolume";

(async () => {
    const r = await handler({
        pathParameters: {
            dex: "astroport"
        }
    } as unknown as AWSLambda.APIGatewayEvent)
    const d = JSON.parse(r.body)
    console.log(d.volumeHistory.length)
    //console.log(JSON.stringify(d, null, 2))
})()