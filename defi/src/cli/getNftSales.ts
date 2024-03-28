import { queryFlipside } from "@defillama/dimension-adapters/helpers/flipsidecrypto"
import PromisePool from "@supercharge/promise-pool/dist"
import fetch from "node-fetch"

async function main(){
    const collections = await fetch("https://nft.llama.fi/collections").then(r=>r.json())
    const timelines = await queryFlipside(`
    select
  nft_address,
  PROJECT_NAME,
  min(block_timestamp),
  max(block_timestamp),
  sum(NFT_COUNT)
from
  ethereum.core.ez_nft_mints
where
  mint_price_usd != 0
group by
  nft_address,
  PROJECT_NAME
order by
  sum(mint_price_usd) desc`)
  await PromisePool.for(collections).withConcurrency(100).process(async (collection:any)=>{
    try{
        const sales = await queryFlipside(`select
        sum(eth_value)
    FROM
        (
        select DISTINCT
            tx_hash
        from
            ethereum.core.ez_nft_mints
        where
            nft_address = '${collection.collectionId}'
        ) sales
        INNER JOIN ethereum.core.fact_transactions txs ON sales.tx_hash = txs.tx_hash;`)
        const timeline = timelines.find((t:any)=>t[0]===collection.collectionId) ?? []
        const start = timeline[2]
        const end = timeline[3]
        const price = start===undefined?0:(await fetch(`https://coins.llama.fi/prices/historical/${Math.round(new Date(start).getTime()/1e3)}/coingecko:ethereum`).then(r=>r.json())).coins["coingecko:ethereum"].price
        const info = [collection.collectionId, collection.name, collection.symbol, sales[0][0], sales[0][0]*price, price, start, end]
        console.log(info.join(","))
    } catch(e){
        console.log(collection, e)
    }
  })
}
main()