import { dailyTvl } from "../utils/getLastRecord";
import dynamodb, { getHistoricalValues } from "../utils/shared/dynamodb";
import { getProtocol } from "./utils"

const protocolsToMove = ["Olympus DAO"]
async function main(){
    await Promise.all(protocolsToMove.map(async protocolName=>{
        const protocol = getProtocol(protocolName);
        const treasuryData = await getHistoricalValues(dailyTvl(protocol.id)) // TODO do the same for dailyTokensTvl, dailyUsdTokensTvl...
        await Promise.all(treasuryData.map(async t=>{
            t.PK = `${protocol.id}-treasury`
            await dynamodb.put(t)
        }))
    }))
    process.exit(0)
}
main()