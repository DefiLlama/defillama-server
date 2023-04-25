require("dotenv").config();
import { isAcceptedChain } from "../../../../dimension-adapters/users/utils/convertChain";
import { queryFlipside } from "../../../../dimension-adapters/helpers/flipsidecrypto";
import { PromisePool } from '@supercharge/promise-pool'
import { storeNewUsers } from "../../../users/storeUsers";

export async function storeAllNewUsers({ name, addresses, id }: {name:string, addresses:{[chain:string]:any}, id:any}) {
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
        SELECT
          block_timestamp,
          from_address,
          tx_hash,
          to_address,
          'bsc' as chain
        FROM
          bsc.core.fact_transactions
        UNION ALL
        SELECT
          block_timestamp,
          from_address,
          tx_hash,
          to_address,
          'ethereum' as chain
        FROM
          ethereum.core.fact_transactions
        UNION ALL
        SELECT
          block_timestamp,
          from_address,
          tx_hash,
          to_address,
          'polygon' as chain
        FROM
          polygon.core.fact_transactions
        UNION ALL
        SELECT
          block_timestamp,
          from_address,
          tx_hash,
          to_address,
          'arbitrum' as chain
        FROM
          arbitrum.core.fact_transactions
        UNION ALL
        SELECT
          block_timestamp,
          from_address,
          tx_hash,
          to_address,
          'optimism' as chain
        FROM
          optimism.core.fact_transactions
        UNION ALL
        SELECT
          block_timestamp,
          from_address,
          tx_hash,
          to_address,
          'avalanche' as chain
        FROM
          avalanche.core.fact_transactions
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
            const date = new Date(`${dateString} UTC`)
            const start = Math.round(date.getTime() / 1e3)
            const end = start + 24 * 3600
            if(end > Date.now()/1e3){
                return
            }
            try{
                await storeNewUsers(start, end, id, "all", users) // if already stored -> don't overwrite
            } catch(e){
                if(!String(e).includes("duplicate key value violates unique constraint")){
                    console.error(`Couldn't store users for ${name}`, e)
                }
            }
        })
    console.log(`${name} processed (id:${id})`)
}