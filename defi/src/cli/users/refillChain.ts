require("dotenv").config();
import { queryFlipside } from "../../dimension_migration/helpers/flipsidecrypto";
import { PromisePool } from '@supercharge/promise-pool'
import { storeUsers } from "../../users/storeUsers";
import { queryAllium } from "../../dimension_migration/helpers/allium";

async function storeUsersInDb(chain:string, usersChart:[string, number][], suffix = " UTC"){
    await PromisePool
            .withConcurrency(10)
            .for(usersChart).process(async ([dateString, users]) => {
                const date = new Date(dateString+suffix)
                const start = Math.round(date.getTime() / 1e3)
                const end = start + 24 * 3600
                if(end > Date.now()/1e3){
                    return
                }
                try{
                    await storeUsers(start, end, `chain#${chain}`, "all", users) // if already stored -> don't overwrite
                } catch(e){
                    if(!String(e).includes("duplicate key value violates unique constraint")){
                        console.error(`Couldn't store users on ${chain}`, e)
                    }
                }
            })
}

async function main(){
    await Promise.all([
        "arbitrum", "avalanche", "bsc", "ethereum", "gnosis", "optimism", "polygon",
    ].map(async (chain) => {
        const usersChart = await queryFlipside(`SELECT
            date_trunc(day, block_timestamp) as dt, 
            count(DISTINCT FROM_ADDRESS) uniques
        from
            ${chain}.core.fact_transactions
        group by dt`)
        await storeUsersInDb(chain, usersChart)
        
    }))
}

async function allium(){
    await Promise.all([
        "tron",
    ].map(async (chain) => {
        const usersChart = await queryAllium(`SELECT
            date_trunc('day', block_timestamp) as dt, 
            count(DISTINCT FROM_ADDRESS) uniques
        from
            ${chain}.raw.transactions
        group by dt`)
        await storeUsersInDb(chain, usersChart.map((r:any)=>[r.dt, r.uniques]), "Z")
        
    }))
}

async function solana(){
    const usersChart = await queryFlipside(`SELECT
        date_trunc(day, block_timestamp) as dt, 
        count(DISTINCT SIGNERS[0]) uniques
    from
        solana.core.fact_transactions
    group by dt`)
    await storeUsersInDb("solana", usersChart)
}

async function near(){
    const usersChart = await queryFlipside(`SELECT
        date_trunc(day, block_timestamp) as dt, 
        count(DISTINCT TX_SIGNER) uniques
    from
        near.core.fact_transactions
    group by dt`)
    await storeUsersInDb("near", usersChart)
}

async function osmosis(){
    const usersChart = await queryFlipside(`SELECT
        date_trunc(day, block_timestamp) as dt, 
        count(DISTINCT TX_FROM) uniques
    from
        osmosis.core.fact_transactions
    group by dt`)
    await storeUsersInDb("osmosis", usersChart)
}
Promise.all([allium()]).then(()=>console.log("finished!"))