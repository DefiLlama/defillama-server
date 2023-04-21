require("dotenv").config();
import { convertChainToFlipside, isAcceptedChain } from "../../../../dimension-adapters/users/utils/convertChain";
import { queryFlipside } from "../../../../dimension-adapters/helpers/flipsidecrypto";
import { PromisePool } from '@supercharge/promise-pool'
import { storeGas } from "../../../users/storeUsers";
import { getGasPrice } from "../../../users/utils";

export async function storeChainGas({ name, addresses, id }: {name:string, addresses:{[chain:string]:any}, id:any}) {
    await Promise.all(Object.entries(addresses)
    .filter(([chain]) => isAcceptedChain(chain))
    .map(async ([chain, chainAddresses]: [string, string[]]) => {
        const usersChart = await queryFlipside(`SELECT
            date_trunc(day, block_timestamp) as dt, 
            sum(TX_FEE)
        from
            ${convertChainToFlipside(chain)}.core.fact_transactions
        where
        ${chainAddresses.length > 1 ?
                `TO_ADDRESS in (${chainAddresses.map(a => `'${a.toLowerCase()}'`).join(',')})` :
                `TO_ADDRESS = '${chainAddresses[0].toLowerCase()}'`}
        group by dt`)
        await PromisePool
            .withConcurrency(5)
            .for(usersChart as [string, number][]).process(async ([dateString, gas]) => {
                const date = new Date(`${dateString} UTC`)
                const start = Math.round(date.getTime() / 1e3)
                const end = start + 24 * 3600
                if(end > Date.now()/1e3){
                    return
                }
                try{
                    const price = await getGasPrice(start, end, chain)
                    await storeGas(start, end, id, chain, Number(gas), Number(gas)*price) // if already stored -> don't overwrite
                } catch(e){
                    if(!String(e).includes("duplicate key value violates unique constraint")){
                        console.error(`Couldn't store users for ${name} on ${chain}`, e)
                    }
                }
            })
    }))
console.log(`${name} processed (id:${id})`)
}