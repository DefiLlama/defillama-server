import "./setup.ts"
import { handler } from "../handlers/getStats";

(async () => {
    const result = await handler({
        pathParameters: {
            dex: "quickswap"
        }
    } as unknown as AWSLambda.APIGatewayEvent)
    const jr = JSON.parse(result.body)
    console.log(jr.find((jri: any) => jri.timestamp === 1658620800))
})()