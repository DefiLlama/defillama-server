import { handler } from "./getOverviewProcess";
import { APIGatewayProxyEvent } from "aws-lambda";
import { sendDiscordAlert } from "../utils/notify";
import { autoBackfill } from "../cli/backfillUtilities/backfillFunction";
import loadAdaptorsData from "../data"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";

export default async (event: { type: string }) => {
    const response = await handler({
        pathParameters: { chain: undefined, type: event.type }
    } as unknown as APIGatewayProxyEvent, true)
    const parsedBody = JSON.parse(response.body)
    const errorsArr: string[] = parsedBody?.errors
    console.log("response", response.body)
    const returnedProtocols = parsedBody.protocols.map((p: any) => p.module)
    const protocolsList = Object.entries(loadAdaptorsData(event.type as AdapterType).config).filter(([_key, config]) => config.enabled).map(m => m[0])
    const notIncluded = []
    for (const prot of protocolsList) {
        if (!returnedProtocols.includes(prot)) {
            console.log("not included", prot)
            notIncluded.push(prot)
        }
    }
    if (errorsArr && errorsArr.length > 0) {
        await sendDiscordAlert(`${errorsArr.length} adapters failed to update... Retrying...`, event.type)
        await autoBackfill(['', '', event.type, 'all'])
    }
    else {
        await sendDiscordAlert(`Looks like all good`, event.type)
    }
    if (notIncluded.length > 0)
        await sendDiscordAlert(`The following protocols haven't been included in the response: ${notIncluded.join(", ")} <@!983314132411482143>`, event.type, false)
    else
        await sendDiscordAlert(`All protocols has been ranked <@!983314132411482143>`, event.type, false)
    return
}