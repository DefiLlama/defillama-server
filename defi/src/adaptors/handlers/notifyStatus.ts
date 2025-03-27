import { handler, IGetOverviewResponseBody } from "./getOverviewProcess";
import { APIGatewayProxyEvent } from "aws-lambda";
import { sendDiscordAlert } from "../utils/notify";
import { autoBackfill } from "../cli/backfillUtilities/backfillFunction";
import loadAdaptorsData from "../data"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";

export const DISCORD_USER_0xgnek_ID = '<@!736594617918554182>'
const DISCORD_ROLE_llama_ID = '<@&849669546448388107>'

export default async (event: { type: string }) => {
    const response = await handler({
        pathParameters: { chain: undefined, type: event.type }
    } as unknown as APIGatewayProxyEvent, true)
    const parsedBody = JSON.parse(response.body) as IGetOverviewResponseBody
    const errorsArr = parsedBody?.errors
    console.log("response", response.body)
    const returnedProtocols = parsedBody.protocols.map((p: any) => p.module)
    const protocolsList = Object.entries((loadAdaptorsData(event.type as AdapterType)).config).filter(([_key, config]) => config.enabled).map(m => m[0])
    let notIncluded = []
    for (const prot of protocolsList) {
        if (!returnedProtocols.includes(prot)) {
            console.log("not included", prot)
            notIncluded.push(prot)
        }
    }
    const zeroValueProtocols = []
    for (const [key, value] of Object.entries(parsedBody.totalDataChartBreakdown?.slice(-1)[0][1] ?? {})) {
        if (value === 0) zeroValueProtocols.push(key)
    }
    if (notIncluded.length > 0) {
        await sendDiscordAlert(`The following protocols haven't been included in the response: ${notIncluded.join(", ")}`, event.type)
        await sendDiscordAlert(`${notIncluded.length} protocols haven't been included in the response ${DISCORD_USER_0xgnek_ID}`, event.type, false)
    }
    else
        await sendDiscordAlert(`All protocols have been ranked ${DISCORD_USER_0xgnek_ID}`, event.type, false)
    const hasErrors = errorsArr && errorsArr.length > 0
    const hasZeroValues = zeroValueProtocols.length > 0
    if (hasErrors || hasZeroValues) {
        if (hasZeroValues)
            await sendDiscordAlert(`${zeroValueProtocols.length} adapters report 0 value dimension, this might be because the source haven't update the volume for today or because simply theres no activity on the protocol... Will retry later... \n${zeroValueProtocols.join(', ')}`, event.type)
        if (hasErrors)
            await sendDiscordAlert(`${errorsArr.length} adapters failed to update... Retrying... ${DISCORD_USER_0xgnek_ID}`, event.type, false)
        if (hasErrors && errorsArr.length > 30 && (new Date()).getUTCHours() > 6)
            await sendDiscordAlert(`${errorsArr.length} adapters failed to update... Retrying... ${DISCORD_ROLE_llama_ID}`, event.type, false)
        await autoBackfill(['', process.argv[1], event.type, 'all'])
    }
    else {
        await sendDiscordAlert(`Looks like all good`, event.type)
    }
    return
}