import { handler, IGetDexsResponseBody } from "./dexVolumes/handlers/getDexs";
import { APIGatewayProxyEvent } from "aws-lambda";

const event = {
    pathParameters: { chain: undefined }
} as unknown as APIGatewayProxyEvent

export default async () => {
    const response = await handler(event, undefined)
    console.log(JSON.parse(response.body) as IGetDexsResponseBody)
}