import {sluggifyString} from "./utils/sluggify"

const normalize = (str:string) => sluggifyString(str).replace(/[^a-zA-Z0-9_-]/, "").replace(/[^a-zA-Z0-9_-]/, "").replace(/[^a-zA-Z0-9_-]/, "")
const standardizeProtocolName = (tokenName = '') =>
	tokenName?.toLowerCase().split(' ').join('-').split("'").join('')

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
    let results = protocols.protocols.map(p=>({
        id: `protocol_${normalize(p.name)}`,
        name: p.name,
        symbol: p.symbol,
        tvl: p.tvl,
        logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(parent.name)}?w=48&h=48`,
        route: `/protocol/${standardizeProtocolName(p.name)}`
    }) as any).concat(protocols.parentProtocols.map(parent=>({
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
        route: `/chain/${chain}`
    }))).concat(protocols.protocolCategories.map(category=>({
        id: `category_${normalize(category)}`,
        name: `All protocols in ${category}`,
        tvl: categoryTvl[category],
        route: `/protocols/${category}`
    })))
    return results
}

export default async ()=>{
    const searchResults = await generateSearchList()
    const submit = await fetch(`https://search.defillama.com/indexes/protocols/documents`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.SEARCH_MASTER_KEY}`
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
}