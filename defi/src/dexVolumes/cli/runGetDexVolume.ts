import "./setup.ts"
import { handler } from "../handlers/getDexVolume";

handler({
    pathParameters: {
        dex: "uniswap"
    }
} as unknown as AWSLambda.APIGatewayEvent)