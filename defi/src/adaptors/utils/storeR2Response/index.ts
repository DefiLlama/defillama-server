import { getR2, storeR2JSONString } from "../../../utils/r2";
import { IGetOverviewResponseBody } from "../../handlers/processProtocolsSummary";

const ADAPTORS_FOLDER_KEY = 'dimensions'

export const cacheResponseOnR2 = async (key: string, response: string) => {
    console.log("Storing R2 with key", `${ADAPTORS_FOLDER_KEY}/${key}.json`, response)
    await storeR2JSONString(`${ADAPTORS_FOLDER_KEY}/${key}.json`, response)
}

export const getCachedResponseOnR2 = async (key: string): Promise<IGetOverviewResponseBody | undefined> => {
    console.log("Get R2 with key", `${ADAPTORS_FOLDER_KEY}/${key}.json`)
    const objectString = await getR2(`${ADAPTORS_FOLDER_KEY}/${key}.json`).catch(e=>console.error("R2Storage:", e))
    console.log("R2Storage:response", objectString)
    console.log("R2Storage:response", objectString, JSON.stringify(objectString))
    if (objectString) {
        try {
            return JSON.parse(objectString) as IGetOverviewResponseBody
        } catch (error) {
            console.error(error)
        }
    }
    return undefined
}