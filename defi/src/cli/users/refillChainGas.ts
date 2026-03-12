require("dotenv").config();
import protocolAddresses from "../../dimension_migration/users/routers/routerAddresses";
import { isAcceptedChain } from "../../dimension_migration/users/utils/convertChain";
import { PromisePool } from '@supercharge/promise-pool'
import { storeChainGas } from "./queries/gas";

async function main() {
    const filtered = protocolAddresses.filter(addresses => {
        return Object.entries(addresses.addresses).some(([chain, addys]) => isAcceptedChain(chain) && addys.length > 0)
    })
    await PromisePool
        .withConcurrency(5)
        .for(filtered).process(storeChainGas)
}
main()