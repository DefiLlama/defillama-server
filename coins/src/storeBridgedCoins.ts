import { storeTokens } from "./adapters/bridges";

export default async function handler() {
    await storeTokens()
}