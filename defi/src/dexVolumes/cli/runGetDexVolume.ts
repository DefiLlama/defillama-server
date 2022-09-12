import "./setup.ts"
import { handler } from "../handlers/getDexVolume";

(async () => {
    const r = await handler({
        pathParameters: {
            dex: "bancor-v2.1"
        }
    } as unknown as AWSLambda.APIGatewayEvent)
    const d = JSON.parse(r.body)
    delete d.volumeHistory
    console.log(JSON.stringify(d, null, 2))
})()