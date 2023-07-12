import { storeTokens } from "./adapters/bridges";
import { storeR2JSONString } from "./utils/r2";

export default async function handler() {
    const bridgedTokens = await storeTokens()
    await storeR2JSONString(`bridgedTokens.json`, JSON.stringify(bridgedTokens), 60 * 60);
}
