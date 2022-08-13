import "./setup.ts"
import { handler } from "../handlers/getDexVolume";

(async () => {
    const r = await handler({
        pathParameters: {
            dex: "1inch-network"
        }
    } as unknown as AWSLambda.APIGatewayEvent)
    const d = JSON.parse(r.body)
    console.log(JSON.stringify(d, null, 2))
})()