import { getR2, storeR2 } from "../../../utils/r2";
import { IGetOverviewResponseBody } from "../../handlers/processProtocolsSummary";

const ADAPTORS_FOLDER_KEY = 'dimensions'

export const cacheResponseOnR2 = async (key: string, response: string) => {
    await storeR2(`${ADAPTORS_FOLDER_KEY}/${key}`, response)
}

export const getCachedResponseOnR2 = async (key: string): Promise<IGetOverviewResponseBody | undefined> => {
    const objectString = await getR2(`${ADAPTORS_FOLDER_KEY}/${key}`).catch(e=>console.error("R2Storage:", e))
    console.log("R2Storage:response", objectString)
    if (objectString) {
        try {
            return JSON.parse(objectString) as IGetOverviewResponseBody
        } catch (error) {
            console.error(error)
        }
    }
    return undefined
}