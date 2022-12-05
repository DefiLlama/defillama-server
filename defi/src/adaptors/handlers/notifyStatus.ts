import { handler } from "./getOverview";
import { APIGatewayProxyEvent } from "aws-lambda";
import { sendDiscordAlert } from "../utils/notify";
import { autoBackfill } from "../cli/backfillUtilities/backfillFunction";

export default async (event: { type: string }) => {
    const response = await handler({
        pathParameters: { chain: undefined, type: event.type }
    } as unknown as APIGatewayProxyEvent, true)
    const errorsArr: string[] = JSON.parse(response.body)?.errors
    if (errorsArr.length > 0) {
        await sendDiscordAlert(`${errorsArr.length} adapters failed to update... Retrying...`, event.type)
        await autoBackfill(['', '', event.type, 'all'])
    }
    else {
        await sendDiscordAlert(`Looks like all good`, event.type)
    }
    return
}