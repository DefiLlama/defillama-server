import { PromisePool } from "@supercharge/promise-pool";
require("dotenv").config();

const num_pages = 20


async function main() {
    const pages = new Array(num_pages).fill(0).map((_, i) => i + 1)
    const unlocksTracked = await fetch(`https://api.llama.fi/emissions`).then(r=>r.json()).then((list:any[])=>list.reduce((all, protocol)=>{
        all[protocol.gecko_id] = true
        return all
    }, {}))
    const { results } = await PromisePool
        .withConcurrency(4)
        .for(pages)
        .process(async page => fetch(`https://pro-api.coingecko.com/api/v3/coins/markets?x_cg_pro_api_key=${process.env.CG_KEY}&vs_currency=usd&per_page=250&page=${page}`).then(r => r.json()))
    const usable = results.flat().filter(p=>p.market_cap>100e6 && unlocksTracked[p.id] !== true).map(p => {
        const fdv = p.current_price * p.total_supply
        return {
            name: p.name, 
            mcap: p.market_cap / 1e9, 
            fdv: fdv / 1e9, 
            mcap_rank: p.market_cap_rank, 
            fdvByMcap: fdv/p.market_cap
        }
    })
    function calculateScore(p: typeof usable[0]){
        return p.fdvByMcap
    }
    console.table(usable.sort((a, b) => calculateScore(b) - calculateScore(a)).slice(0, 100))
    //const csv = [["name", "mcap (bn)", "fdv (bn)", "mcap rank", "fdv/mcap"]].concat(usable).map(r => r.join(',')).join('\n')
    //console.log(usable)
}
main()
