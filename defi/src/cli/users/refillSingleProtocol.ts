import protocolAddresses from "../../../dimension-adapters/users/routers/routerAddresses";
import { storeChainGas } from "./queries/gas";
import { storeChainTxs } from "./queries/txs";
import { storeAllUsers, storeChainUsers } from "./queries/users";
import postgres from "postgres";

const sql = postgres(process.env.ACCOUNTS_DB!);

async function main() {
    const protocolName = process.argv[2]
    const protocol = protocolAddresses.find(addresses => addresses.name.toLowerCase() === protocolName)
    if(protocol === undefined){
        console.error(`No protocol with name "${protocolName}"`)
        return
    }
    console.log(`Deleting data for protocol with id ${protocol.id}`)
    await Promise.all([
        sql`DELETE FROM dailyUsers WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM hourlyUsers WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM dailyTxs WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM hourlyTxs WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM dailyGas WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM hourlyGas WHERE protocolId = ${protocol.id};`,

    ])
    console.log(`Refilling data`)
    await Promise.all([
        storeAllUsers(protocol),
        storeChainGas(protocol),
        storeChainUsers(protocol),
        storeChainTxs(protocol)
    ])
    console.log(`Finished!`)
}
main()