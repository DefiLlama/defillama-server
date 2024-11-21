import { getAccountsDBConnection } from "../../../../getDBConnection"

export async function deleteUserDataForProtocol(protocolId:string){
    const sql = getAccountsDBConnection()
    await Promise.all([
        sql`DELETE FROM dailyUsers WHERE protocolId = ${protocolId};`,
        sql`DELETE FROM hourlyUsers WHERE protocolId = ${protocolId};`,
        sql`DELETE FROM dailyTxs WHERE protocolId = ${protocolId};`,
        sql`DELETE FROM hourlyTxs WHERE protocolId = ${protocolId};`,
        sql`DELETE FROM dailyGas WHERE protocolId = ${protocolId};`,
        sql`DELETE FROM hourlyGas WHERE protocolId = ${protocolId};`,
        sql`DELETE FROM dailyNewUsers WHERE protocolId = ${protocolId};`,
        sql`DELETE FROM hourlyNewUsers WHERE protocolId = ${protocolId};`,
    ])
}
