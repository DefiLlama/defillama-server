import { addressList } from "../../../dimension-adapters/users/list";
import { storeChainGas } from "./queries/gas";
import { storeAllNewUsers } from "./queries/newUsers";
import { storeChainTxs } from "./queries/txs";
import { storeAllUsers, storeChainUsers } from "./queries/users";
import postgres from "postgres";

const sql = postgres(process.env.ACCOUNTS_DB!);

async function main() {
    const protocolName = process.argv[2]
    const protocol = addressList.find(addresses => addresses.name.toLowerCase() === protocolName) as any
    if(protocol === undefined){
        console.error(`No protocol with name "${protocolName}"`)
        return
    }
    if(protocol.getAddresses){
        protocol.addresses = await protocol.getAddresses()
    }
    console.log(`Deleting data for protocol with id ${protocol.id}`)
    await Promise.all([
        sql`DELETE FROM dailyUsers WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM hourlyUsers WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM dailyTxs WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM hourlyTxs WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM dailyGas WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM hourlyGas WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM dailyNewUsers WHERE protocolId = ${protocol.id};`,
        sql`DELETE FROM hourlyNewUsers WHERE protocolId = ${protocol.id};`,
    ])
    console.log(`Refilling data`)
    await Promise.all([
        storeAllUsers(protocol).then(()=>console.log("all users refilled")),
        storeChainGas(protocol).then(()=>console.log("gas refilled")),
        storeChainUsers(protocol).then(()=>console.log("chain users refilled")),
        storeChainTxs(protocol).then(()=>console.log("txs refilled")),
        storeAllNewUsers(protocol).then(()=>console.log("new users refilled")),
    ])
    console.log(`Finished!`)
}
main()