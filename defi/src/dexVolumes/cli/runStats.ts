import "./setup.ts"
import { handler } from "../handlers/stats";

(async () => {
    const result = await handler({
        pathParameters: {
            dex: "uniswap"
        }
    } as unknown as AWSLambda.APIGatewayEvent)
    const jr = JSON.parse(result.body)
    console.log(jr[jr.length - 1])
})()