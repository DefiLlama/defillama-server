import { getProtocol } from "../../utils";
import { deleteUserDataForProtocol } from "./utils/deleteUserData";

async function main() {
    const protocolName = process.argv[2].toLowerCase()
    const protocol = getProtocol(protocolName)
    if(protocol === undefined){
        console.error(`No protocol with name "${protocolName}"`)
        return
    }
    console.log(`Deleting data for protocol with id ${protocol.id}`)
    await deleteUserDataForProtocol(protocol.id)
    console.log(`Finished!`)
    process.exit(0);
}
main()