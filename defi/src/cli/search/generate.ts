import { writeFile as writeFileRaw } from "fs"
import { promisify } from "util"
import {sluggifyString} from "../../utils/sluggify"
const writeFile = promisify(writeFileRaw)

const normalize = (str:string) => sluggifyString(str).replace(/[^a-zA-Z0-9_-]/, "").replace(/[^a-zA-Z0-9_-]/, "").replace(/[^a-zA-Z0-9_-]/, "")
const standardizeProtocolName = (tokenName = '') =>
	tokenName?.toLowerCase().split(' ').join('-').split("'").join('')

async function main() {
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
        url: `/protocol/${standardizeProtocolName(p.name)}`
    }) as any).concat(protocols.parentProtocols.map(parent=>({
        id: normalize(parent.id.replace("#", "_")),
        name: parent.name,
        tvl: parentTvl[parent.id] ?? 0,
        logo: `https://icons.llamao.fi/icons/protocols/${standardizeProtocolName(parent.name)}?w=48&h=48`,
        url: `/protocol/${standardizeProtocolName(parent.name)}`
    }))).concat(protocols.chains.map(chain=>({
        id: `chain_${normalize(chain)}`,
        name: chain,
        logo: `https://icons.llamao.fi/icons/chains/rsz_${standardizeProtocolName(chain)}?w=48&h=48`,
        tvl: chainTvl[chain],
        url: `/chain/${chain}`
    }))).concat(protocols.protocolCategories.map(category=>({
        id: `category_${normalize(category)}`,
        name: `All protocols in ${category}`,
        tvl: categoryTvl[category],
        url: `/protocols/${category}`
    })))
    await writeFile("./searchProtocols.json", JSON.stringify(results))
}
main()
