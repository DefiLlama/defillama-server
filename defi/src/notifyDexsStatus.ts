import { handler } from "./adaptors/handlers/getOverview";
import { APIGatewayProxyEvent } from "aws-lambda";
import { sendDiscordAlert } from "./adaptors/utils/notify";
import { autoBackfill } from "./adaptors/cli/backfillUtilities/backfillFunction";

const event = {
    pathParameters: { chain: undefined, type: "dexs" }
} as unknown as APIGatewayProxyEvent

export default async () => {
    const response = await handler(event, true)
    const errorsArr: string[] = JSON.parse(response.body)?.errors
    if (errorsArr.length > 0) {
        await sendDiscordAlert(`${errorsArr.length} adapters failed to update... Retrying...`)
        await autoBackfill(['', '', event?.pathParameters?.type??'', 'all'])
    }
    else {
        await sendDiscordAlert(`Looks like all good`)
    }
    return
}