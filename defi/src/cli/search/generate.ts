import { writeFile as writeFileRaw } from "fs"
import { promisify } from "util"
const writeFile = promisify(writeFileRaw)

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
        id: `protocol#${p.name}`,
        name: p.name,
        symbol: p.symbol,
        tvl: p.tvl,
        logo: p.logo
    }) as any).concat(protocols.parentProtocols.map(parent=>({
        id: parent.id,
        name: parent.name,
        tvl: parentTvl[parent.id] ?? 0,
        logo: parent.logo
    }))).concat(protocols.chains.map(chain=>({
        id: `chain#${chain}`,
        name: chain,
        tvl: chainTvl[chain]
    }))).concat(protocols.protocolCategories.map(category=>({
        id: `category#${category}`,
        name: `All protocols in ${category}`,
        tvl: categoryTvl[category]
    })))
    await writeFile("./searchProtocols.json", JSON.stringify(results))
}
main()
