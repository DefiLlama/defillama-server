import { dailyTokensTvl, dailyTvl, dailyUsdTokensTvl } from "../utils/getLastRecord";
import dynamodb, { getHistoricalValues } from "../utils/shared/dynamodb";
import { getProtocol } from "./utils"

const protocolToCopy = "spacefi"
const protocolToReplace = "spacefi"

async function main(){
    const source = getProtocol(protocolToCopy);
    const dest = getProtocol(protocolToReplace)
    await Promise.all([dailyTvl, dailyTokensTvl, dailyUsdTokensTvl].map(async prefix=>{
        const data = await getHistoricalValues(prefix(source.id))
        await Promise.all(data.map(t=>{
            t.PK = prefix(dest.id)
            return dynamodb.put(t)
        }))
    }))
    process.exit(0)
}
main()