import fetch from "node-fetch"
import { ecosystem } from "./developers/npm"
import { npmPK } from "./developers/utils"
import dynamodb from "./utils/shared/dynamodb"
import { wrapScheduledLambda } from "./utils/shared/wrap"

export async function storeNpmDayData(day: string) {
    await Promise.all(Object.values(ecosystem).flat().map(async pkg => {
        const api = `https://api.npmjs.org/downloads/point/${day}/${pkg}`
        const data = await fetch(api).then(r => r.json())
        if(data.error !== undefined){
            throw new Error(`Can't find data for ${pkg} on date ${day}`)
        }
        await dynamodb.put({
            PK: npmPK(pkg),
            SK: Math.round(new Date(data.start).getTime()/1000),
            downloads: data.downloads,
        })
    }))
}

const handler = async () => {
  await storeNpmDayData("last-day");
};

export default wrapScheduledLambda(handler);