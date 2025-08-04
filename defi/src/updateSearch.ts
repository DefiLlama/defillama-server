import fetch from "node-fetch"
import {sluggifyString} from "./utils/sluggify"

const normalize = (str:string) => sluggifyString(str).replace(/[^a-zA-Z0-9_-]/, "").replace(/[^a-zA-Z0-9_-]/, "").replace(/[^a-zA-Z0-9_-]/, "")
const standardizeProtocolName = (tokenName = '') =>
	tokenName?.toLowerCase().split(' ').join('-').split("'").join('')

const frontendPages = [
    { id: "protocols_ranking_tvl", name: "Protocols ranked by TVL", route: "/" },
    { id: "protocols_ranking_fees", name: "Protocols ranked by Fees", route: "/fees" },
    { id: "protocols_ranking_revenue", name: "Protocols ranked by Revenue", route: "/revenue" },
    { id: "protocols_ranking_holders_revenue", name: "Protocols ranked by Holders Revenue", route: "/holders-revenue" },
    { id: "protocols_ranking_earnings", name: "Protocols ranked by Earnings", route: "/earnings" },
    { id: "protocols_ranking_pf", name: "Protocols ranked by P/F", route: "/pf" },
    { id: "protocols_ranking_ps", name: "Protocols ranked by P/S", route: "/ps" },
    { id: "protocols_ranking_dex_volume", name: "Protocols ranked by DEX Volume", route: "/dexs" },
    { id: "protocols_ranking_perp_volume", name: "Protocols ranked by Perp Volume", route: "/perps" },
    { id: "protocols_ranking_dex_aggregator_volume", name: "Protocols ranked by DEX Aggregator Volume", route: "/dex-aggregators" },
    { id: "protocols_ranking_options_premium_volume", name: "Protocols ranked by Options Premium Volume", route: "/options/premium-volume" },
    { id: "protocols_ranking_options_notional_volume", name: "Protocols ranked by Options Notional Volume", route: "/options/notional-volume" },
    { id: "protocols_ranking_net_project_treasury", name: "Protocols ranked by Net Project Treasury", route: "/net-project-treasury" },
    { id: "protocols_ranking_total_borrowed", name: "Protocols ranked by Total Borrowed", route: "/total-borrowed" },
    { id: "protocols_ranking_total_staked", name: "Protocols ranked by Total Staked", route: "/total-staked" },
    { id: "protocols_ranking_pool2_tvl", name: "Protocols ranked by Pool2 TVL", route: "/pool2" },
    { id: "protocols_ranking_market_cap", name: "Protocols ranked by Market Cap", route: "/mcaps" },
    { id: "protocols_ranking_token_price", name: "Protocols ranked by Token Price", route: "/token-prices" },
    { id: "upcoming_unlocks", name: "Upcoming Unlocks", route: "/unlocks" },
    { id: "stablecoin_supply", name: "Stablecoin Supply", route: "/stablecoins" },
    { id: "cex_assets", name: "Centralized Exchanges ranked by assets under custody", route: "/cexs" },
    { id: "protocols_ranking_total_value_lost_in_hacks", name: "Protocols ranked by Total Value Lost in Hacks", route: "/hacks/total-value-lost" },
    { id: "protocols_ranking_total_raises", name: "Total Raised by project", route: "/raises" },

];

async function generateSearchList() {
    const protocols:{
        chains: string[],
        parentProtocols: any[],
        protocolCategories: string[],
        protocols: any[]
    } = await fetch(`https://api.llama.fi/lite/protocols2`).then(r=>r.json())
    const parentTvl = {} as any
    const chainTvl = {} as any
    const categoryTvl = {} as any

    const addOrCreate = (acc:any, key:string, val:number)=>{
        if(!acc[key]){
            acc[key] = val
        } else {
            acc[key] += val
        }
    }
    protocols.protocols.forEach(p=>{
        Object.entries(p.chainTvls).forEach(chain=>{
            addOrCreate(chainTvl, chain[0], (chain[1] as any).tvl)
        })
        addOrCreate(categoryTvl, p.category, p.tvl)
        if(p.parentProtocol){
            addOrCreate(parentTvl, p.parentProtocol, p.tvl)
        }
    })
    let results = frontendPages.concat(protocols.protocols.map(p=>({
        id: `protocol_${normalize(p.name)}`,
        name: p.name,
        symbol: p.symbol,
        tvl: p.tvl,
        logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(p.name)}?w=48&h=48`,
        route: `/protocol/${standardizeProtocolName(p.name)}`,
        ...(p.deprecated ? {deprecated: true} : {})
    }) as any)).concat(protocols.parentProtocols.map(parent=>({
        id: normalize(parent.id.replace("#", "_")),
        name: parent.name,
        tvl: parentTvl[parent.id] ?? 0,
        logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(parent.name)}?w=48&h=48`,
        route: `/protocol/${standardizeProtocolName(parent.name)}`
    }))).concat(protocols.chains.map(chain=>({
        id: `chain_${normalize(chain)}`,
        name: chain,
        logo: `https://icons.llamao.fi/icons/chains/rsz_${standardizeProtocolName(chain)}?w=48&h=48`,
        tvl: chainTvl[chain],
        route: `/chain/${standardizeProtocolName(chain)}`
    }))).concat(protocols.protocolCategories.map(category=>({
        id: `category_${normalize(category)}`,
        name: `All protocols in ${category}`,
        tvl: categoryTvl[category],
        route: `/protocols/${standardizeProtocolName(category)}`
    })))
    return results
}

const main = async ()=>{
    const searchResults = await generateSearchList()
    await fetch(`https://search.defillama.com/indexes/protocols/documents`, {
        method: "DELETE",
        headers: {
            "Authorization": `Bearer ${process.env.SEARCH_MASTER_KEY}`,
        },
    }).then(r=>r.json())
    const submit = await fetch(`https://search.defillama.com/indexes/protocols/documents`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.SEARCH_MASTER_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchResults)
    }).then(r=>r.json())
    const status = await fetch(`https://search.defillama.com/tasks/${submit.taskUid}`, {
        headers: {
            "Authorization": `Bearer ${process.env.SEARCH_MASTER_KEY}`
        },
    }).then(r=>r.json())
    const errorMessage = status?.details?.error?.message
    if(errorMessage){
        console.log(errorMessage)
    }
    console.log(status)
}

//export default main
main()