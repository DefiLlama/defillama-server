import "./setup.ts"
import { handler } from "../handlers/getStats";

(async () => {
    const result = await handler({
        pathParameters: {
            dex: "1inch"
        }
    } as unknown as AWSLambda.APIGatewayEvent)
    const jr = JSON.parse(result.body)
    console.log(JSON.stringify(jr, null, 2))
})()