import { handler as externalEndpointsCache, cacheExternalResponseHandler } from "../../externalEndpointsCache";


(async () => {
    const url = "https://api.coingecko.com/api/v3/exchanges?per_page=250"
    const res = await externalEndpointsCache({
        queryStringParameters: {
            url: encodeURIComponent(url)
        }
    } as any)

    console.log("res", res)
    console.log(await cacheExternalResponseHandler({
        url: encodeURIComponent(url)
    }))
})()