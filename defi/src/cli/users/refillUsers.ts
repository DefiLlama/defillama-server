require("dotenv").config();
import protocolAddresses from "../../../dimension-adapters/users/routers/routerAddresses";
import { convertChainToFlipside, isAcceptedChain } from "../../../dimension-adapters/users/utils/convertChain";
import { queryFlipside } from "../../../dimension-adapters/helpers/flipsidecrypto";
import { PromisePool } from '@supercharge/promise-pool'
import { storeUsers } from "../../users/storeUsers";

async function main() {
    const filtered = protocolAddresses.filter(addresses => {
        return Object.entries(addresses.addresses).some(([chain, addys]) => isAcceptedChain(chain) && addys.length > 0)
    })
    await PromisePool
        .withConcurrency(5)
        .for(filtered).process(async ({ name, addresses, id }) => {
            const chainArray = Object.entries(addresses).filter(([chain])=>isAcceptedChain(chain))
            const usersChart = await queryFlipside(`
WITH
  ${chainArray.map(([chain, chainAddresses]:[string, string[]])=>
    `${chain} AS (
        SELECT
            date_trunc(day, block_timestamp) as dt,
            from_address
        FROM
            ${convertChainToFlipside(chain)}.core.fact_transactions
        WHERE
            ${chainAddresses.length>1?
                `TO_ADDRESS in (${chainAddresses.map(a=>`'${a.toLowerCase()}'`).join(',')})`:
                `TO_ADDRESS = '${chainAddresses[0].toLowerCase()}'`}
        )`).join(',\n')}

SELECT
  dt,
  COUNT(DISTINCT from_address) AS active_users
FROM
  (
    ${chainArray.map(([chain])=>`SELECT
      dt,
      from_address
    FROM
    ${chain}`).join("\nUNION\n")}
  )
GROUP BY
  dt
ORDER BY
  dt DESC;`)
            await PromisePool
                .withConcurrency(10)
                .for(usersChart as [string, number][]).process(async ([dateString, users]) => {
                    const date = new Date(`${dateString} UTC`)
                    const start = Math.round(date.getTime() / 1e3)
                    const end = start + 24 * 3600
                    try{
                        //console.log(start, end, id, "all", users)
                        await storeUsers(start, end, id, "all", users) // if already stored -> don't overwrite
                    } catch(e){
                        if(!String(e).includes("duplicate key value violates unique constraint")){
                            console.error(`Couldn't store users for ${name}`, e)
                        }
                    }
                })
            console.log(`${name} processed (id:${id})`)
        })
}
main()