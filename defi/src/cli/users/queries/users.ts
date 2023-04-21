require("dotenv").config();
import { convertChainToFlipside, isAcceptedChain } from "../../../../dimension-adapters/users/utils/convertChain";
import { queryFlipside } from "../../../../dimension-adapters/helpers/flipsidecrypto";
import { PromisePool } from '@supercharge/promise-pool'
import { storeUsers } from "../../../users/storeUsers";

export async function storeChainUsers({ name, addresses, id }: {name:string, addresses:{[chain:string]:any}, id:any}) {
    await Promise.all(Object.entries(addresses)
    .filter(([chain]) => isAcceptedChain(chain))
    .map(async ([chain, chainAddresses]: [string, string[]]) => {
        const usersChart = await queryFlipside(`SELECT
            date_trunc(day, block_timestamp) as dt, 
            count(DISTINCT FROM_ADDRESS) uniques
        from
            ${convertChainToFlipside(chain)}.core.fact_transactions
        where
        ${chainAddresses.length > 1 ?
                `TO_ADDRESS in (${chainAddresses.map(a => `'${a.toLowerCase()}'`).join(',')})` :
                `TO_ADDRESS = '${chainAddresses[0].toLowerCase()}'`}
        group by dt`)
        await PromisePool
            .withConcurrency(10)
            .for(usersChart as [string, number][]).process(async ([dateString, users]) => {
                const date = new Date(`${dateString} UTC`)
                const start = Math.round(date.getTime() / 1e3)
                const end = start + 24 * 3600
                if(end > Date.now()/1e3){
                    return
                }
                try{
                    await storeUsers(start, end, id, chain, users) // if already stored -> don't overwrite
                } catch(e){
                    if(!String(e).includes("duplicate key value violates unique constraint")){
                        console.error(`Couldn't store users for ${name} on ${chain}`, e)
                    }
                }
            })
    }))
    console.log(`${name} processed (id:${id})`)
}

export async function storeAllUsers({ name, addresses, id }: {name:string, addresses:{[chain:string]:any}, id:any}) {
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
          if(end > Date.now()/1e3){
              return
          }
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
}