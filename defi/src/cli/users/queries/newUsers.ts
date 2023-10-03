require("dotenv").config();
import { convertChainToFlipside, isAcceptedChain } from "../../../../dimension-adapters/users/utils/convertChain";
import { queryFlipside } from "../../../../dimension-adapters/helpers/flipsidecrypto";
import { PromisePool } from '@supercharge/promise-pool'
import { storeNewUsers } from "../../../users/storeUsers";

export async function storeAllNewUsers({ name, addresses, id }: {name:string, addresses:{[chain:string]:any}, id:any}) {
  const chainArray = Object.keys(addresses).filter((chain)=>isAcceptedChain(chain)).map(convertChainToFlipside)
    const chainAddresses = Object.entries(addresses).filter(([chain])=>isAcceptedChain(chain)).reduce((all, c)=>all.concat(c[1]), [] as string[])
    const usersChart = await queryFlipside(`
WITH
  first_seen AS (
    SELECT DISTINCT
      MIN(block_timestamp) OVER (
        PARTITION BY
          from_address
      ) AS first_seen_timestamp,
      from_address,
      COUNT(*) OVER (
        PARTITION BY
          from_address
      ) AS total_txs,
      FIRST_VALUE(tx_hash) OVER (
        PARTITION BY
          from_address
        ORDER BY
          block_timestamp ASC
      ) AS first_seen_tx_hash,
      FIRST_VALUE(chain) OVER (
        PARTITION BY
          from_address
        ORDER BY
          block_timestamp ASC
      ) AS first_seen_chain
    FROM
      (
        ${chainArray.map(chain=>
        `SELECT
          block_timestamp,
          from_address,
          tx_hash,
          to_address,
          '${chain}' as chain
        FROM
          ${chain}.core.fact_transactions`).join('\nUNION ALL\n')}
      ) t
    WHERE
      t.to_address IN (${chainAddresses.map(a => `'${a.toLowerCase()}'`).join(',')})
  )
SELECT
  date_trunc('day', first_seen_timestamp) as date,
  COUNT(DISTINCT from_address) as total_new_users
FROM
  first_seen
GROUP BY
  date_trunc('day', first_seen_timestamp);`)
    await PromisePool
        .withConcurrency(10)
        .for(usersChart as [string, number][]).process(async ([dateString, users]) => {
            const date = new Date(dateString)
            const start = Math.round(date.getTime() / 1e3)
            const end = start + 24 * 3600
            if(end > Date.now()/1e3){
                return
            }
            try{
                await storeNewUsers(start, end, id, "all", users) // if already stored -> don't overwrite
            } catch(e){
                if(!String(e).includes("duplicate key value violates unique constraint")){
                    console.error(`Couldn't store new users for ${name}`, e)
                }
            }
        })
}