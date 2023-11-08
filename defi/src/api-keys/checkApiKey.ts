import ddb, { authPK } from "./ddb";

export async function checkApiKey(apiKey: string) {
    const item = await ddb.get({
        PK: authPK(apiKey),
    })
    if (!item.Item) {
        throw new Error("invalid api key")
    }
}