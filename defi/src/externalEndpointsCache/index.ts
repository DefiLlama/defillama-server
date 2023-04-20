import { successResponse, wrap, IResponse, acceptedResponse, errorResponse } from "../utils/shared";
import { cacheResponseOnR2, getCachedResponseOnR2 } from "../adaptors/utils/storeR2Response";
import invokeLambda from "../utils/shared/invokeLambda";
import fetch from "node-fetch";

const allowedURLS: string[] = [
    'https://api.coingecko.com/api/v3/exchanges?per_page=250',
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
]

const cachedResponseKey = (path: string) => `cgcache_${path.split(/[/?=:.]+/).join("_")}`

export const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const url = decodeURIComponent(event.queryStringParameters?.url ?? '')
    console.info("Decoded url", url)
    if (!allowedURLS.includes(url)) return errorResponse({ message: "Url not allowed" })

    const response = await getCachedResponseOnR2<any>(cachedResponseKey(url))

    if (!response) {
        console.info("Response not found, generating...")
        await invokeLambda("defillama-prod-cacheExternalResponse", { url })
        console.info("Returning 202")
        return acceptedResponse("Request accepted, your response is being generated. Please try again this request in some minutes");
    }

    if ((Date.now() - response.lastModified.getTime()) > 1000 * 60 * 60) {
        console.info("Response expired, invoking lambda to update it.")
        await invokeLambda("defillama-prod-cacheExternalResponse", event)
    }

    return successResponse(response.body, 60 * 60); // 1h cache
};

export const cacheExternalResponseHandler = async (event: { url: string }) => {
    if (!event.url) {
        console.error("URL not defined")
        return
    }
    const url = decodeURIComponent(event.url)
    console.info("Decoded url", url)
    const response = await fetch(url).then(res => res.json()).catch(e => {
        console.error(e)
        return undefined
    })
    if (response) {
        await cacheResponseOnR2(cachedResponseKey(url), JSON.stringify(response))
    }
};


export default wrap(handler);
