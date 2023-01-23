import { getR2, storeR2JSONString } from "../../../utils/r2";

const ADAPTORS_FOLDER_KEY = 'dimensions'

export const cacheResponseOnR2 = async (key: string, response: string) => {
    console.info("Storing R2 with key", `${ADAPTORS_FOLDER_KEY}/${key}.json`, response)
    await storeR2JSONString(`${ADAPTORS_FOLDER_KEY}/${key}.json`, response)
}

interface ICachedResponse<T> {
    lastModified: Date, body: T
}

export const getCachedResponseOnR2 = async <T>(key: string): Promise<ICachedResponse<T> | undefined> => {
    console.info("Get R2 with key", `${ADAPTORS_FOLDER_KEY}/${key}.json`)
    const objectString = await getR2(`${ADAPTORS_FOLDER_KEY}/${key}.json`).catch(e => console.error("R2Storage:error", e))
    if (!objectString || !objectString.body || !objectString.lastModified) return
    try {
        return {
            lastModified: objectString.lastModified,
            body: JSON.parse(objectString.body) as T
        }
    } catch (error) {
        console.error("R2Storage:error:parsing", error)
    }
}