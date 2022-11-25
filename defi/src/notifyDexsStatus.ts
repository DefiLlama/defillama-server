import { handler } from "./adaptors/handlers/getOverview";
import { APIGatewayProxyEvent } from "aws-lambda";

const event = {
    pathParameters: { chain: undefined }
} as unknown as APIGatewayProxyEvent

export default async () => {
    const response = await handler(event, true)
    console.log(JSON.parse(response.body))
}