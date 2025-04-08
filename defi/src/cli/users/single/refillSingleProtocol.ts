import { addressList } from "../../../../dimension-adapters/users/list";
import { getAccountsDBConnection } from "../../../utils/shared/getDBConnection";
import { storeChainGas } from "../queries/gas";
import { storeAllNewUsers } from "../queries/newUsers";
import { storeChainTxs } from "../queries/txs";
import { storeAllUsers, storeChainUsers } from "../queries/users";
import { deleteUserDataForProtocol } from "./utils/deleteUserData";

async function main() {
    const sql = getAccountsDBConnection()
    const protocolName = process.argv[2].toLowerCase()
    const protocol = addressList.find(addresses => addresses.name.toLowerCase() === protocolName) as any
    if(protocol === undefined){
        console.error(`No protocol with name "${protocolName}"`)
        return
    }
    if(protocol.getAddresses){
        protocol.addresses = await protocol.getAddresses()
    }
    console.log(`Deleting data for protocol with id ${protocol.id}`)
    await deleteUserDataForProtocol(protocol.id)
    console.log(`Refilling data`)
    await Promise.all([
        storeAllUsers(protocol).then(()=>console.log("all users refilled")),
        storeChainGas(protocol).then(()=>console.log("gas refilled")),
        storeChainUsers(protocol).then(()=>console.log("chain users refilled")),
        storeChainTxs(protocol).then(()=>console.log("txs refilled")),
        storeAllNewUsers(protocol).then(()=>console.log("new users refilled")),
    ])
    console.log(`Finished!`)
    process.exit(0);
}
main()