import { retrieveAlliumResults, startAlliumQuery } from "../../helpers/allium";
import { convertChainToFlipside, isAcceptedChain } from "./convertChain";
import { ChainAddresses, ProtocolAddresses } from "./types";

export async function countNewUsers(addresses: ChainAddresses, start:number, end:number) {
    const chainArray = Object.keys(addresses).filter((chain)=>isAcceptedChain(chain)).map(convertChainToFlipside)
    const chainAddresses = Object.entries(addresses).filter(([chain])=>isAcceptedChain(chain)).reduce((all, c)=>all.concat(c[1]), [] as string[])
    return { queryId: await startAlliumQuery(`
WITH
  all_new_users AS (
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
      FIRST_VALUE(hash) OVER (
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
          hash,
          to_address,
          '${chain}' as chain
        FROM
          ${chain}.raw.transactions`).join('\nUNION ALL\n')}
      ) t
    WHERE
      t.to_address IN (${chainAddresses.map(a => `'${a.toLowerCase()}'`).join(',')})
  )
SELECT
  COUNT(*) as user_count
FROM
  all_new_users
WHERE
  first_seen_timestamp BETWEEN TO_TIMESTAMP_NTZ(${start}) AND TO_TIMESTAMP_NTZ(${end})
`)
    }
    //return query[0].user_count
}

function gasPrice(chain:string){
  if(["avax", "optimism", "base"].includes(chain)){
    return "gas_price"
  }
  return "receipt_effective_gas_price"
}

export function countUsers(addresses: ChainAddresses) {
    return async (start: number, end: number) => {
        const chainArray = Object.entries(addresses).filter(([chain])=>isAcceptedChain(chain))
        return {
          params: chainArray,
          queryId: await startAlliumQuery(`
WITH
  ${chainArray.map(([chain, chainAddresses])=>
    `${chain} AS (
        SELECT
            FROM_ADDRESS,
            HASH,
            ${gasPrice(chain)} * receipt_gas_used as TX_FEE
        FROM
            ${convertChainToFlipside(chain)}.raw.transactions
        WHERE
            ${chainAddresses.length>1?
                `TO_ADDRESS in (${chainAddresses.map(a=>`'${a.toLowerCase()}'`).join(',')})`:
                `TO_ADDRESS = '${chainAddresses[0].toLowerCase()}'`}
            AND BLOCK_TIMESTAMP > TO_TIMESTAMP_NTZ(${start})
            AND BLOCK_TIMESTAMP < TO_TIMESTAMP_NTZ(${end})
        ),
        ${chain}_total AS (
            SELECT
              sum(TX_FEE)/1e18 AS ${chain}_total_gas,
              count(HASH) AS ${chain}_tx_count
            FROM
            ${chain}
          ),
          ${chain}_unique AS (
            SELECT DISTINCT
              FROM_ADDRESS
            FROM
            ${chain}
          ), -- unique users`).join(',\n')},
both AS (
    ${chainArray.map(([chain])=>`SELECT
    FROM_ADDRESS
FROM
    ${chain}`).join("\nUNION ALL\n")}),
${chainArray.map(([chain])=>`${chain}_count AS (
    SELECT
    COUNT(FROM_ADDRESS) AS ${chain}_count_col
    FROM
    ${chain}_unique
)`).join(',\n')},
both_count AS (
    SELECT
    COUNT(DISTINCT FROM_ADDRESS) AS both_count
    FROM
    both
)
SELECT
${chainArray.map(([chain])=>`${chain}_count_col, ${chain}_tx_count, ${chain}_total_gas`).join(', ')},
both_count
FROM
both_count CROSS JOIN
${chainArray.map(([chain])=>`${chain}_total CROSS JOIN ${chain}_count`).join(' CROSS JOIN ')}`
        )
        }
    }
}

export async function parseUserResponse(queryId:string, chainArray:string[]){
  const query = await retrieveAlliumResults(queryId)
  const finalNumbers = Object.fromEntries((chainArray).map(([name])=>[name, {
    users: query[0][`${name}_count_col`],
    txs: query[0][`${name}_tx_count`],
    gas: query[0][`${name}_total_gas`]??0,
}]))
finalNumbers.all = {
    users:query[0].both_count
} as any
return finalNumbers
}

export async function parseChainResponse(queryId:string){
  const query = await retrieveAlliumResults(queryId)
  return {
    all: {
      users: query[0].usercount,
      txs: query[0].txcount
    }
  }
}

export const isAddressesUsable = (addresses:ProtocolAddresses)=>{
    return Object.entries(addresses.addresses).some(([chain, addys])=> isAcceptedChain(chain) && addys && addys.length>0)
}
