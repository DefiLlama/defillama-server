import { cacheResponseOnR2, getCachedResponseOnR2 } from "../../utils/storeR2Response";

export default async <F extends () => Promise<any>>(key: string, fn: F): Promise<Awaited<ReturnType<F>>> => {
    let response = await getCachedResponseOnR2<Awaited<ReturnType<F>>>(key)
        .catch(e => console.error(`Unable to retrieve cached response with key ${key}...`, e))

    if (!response) {
        console.info("Return value not found or expired, (re)generating...")
        try {
            response = {
                body: await fn(),
                lastModified: new Date()
            }
            await cacheResponseOnR2(key, JSON.stringify(response.body))
        } catch (error) {
            console.error(`Response not found and was not posible to store response with key ${key}...`, error)
            throw error
        }
    }
    if ((Date.now() - response.lastModified.getTime()) > 1000 * 60 * 60) {
        try {
            response = {
                body: await fn(),
                lastModified: new Date()
            }
            await cacheResponseOnR2(key, JSON.stringify(response.body))
        } catch (error) {
            console.error(`Response expired and was not posible to regenerate response with key ${key}...`, error)
        }
    }

    return response.body
};