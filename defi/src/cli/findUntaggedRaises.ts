import fetch from "node-fetch"

const get = (url:string) => fetch(url).then(r=>r.json())

const main = async () => {
    const [protocols, raises] = await Promise.all([
        get(`https://api.llama.fi/lite/protocols2`),
        get(`https://api.llama.fi/raises`)
    ])
    const protocolNames = protocols.protocols.reduce((all:any, p:any)=>({
        ...all,
        [p.name.toLowerCase()]: p.defillamaId
    }), {})
    const unmatchedRaises = raises.raises.filter((r:any)=> protocolNames[r.name.toLowerCase()] !== undefined && r.defillamaId === undefined)
    console.table(unmatchedRaises.sort((a:any,b:any)=>a.date-b.date).map(({date, name, amount}:any)=>({date:new Date(date*1e3).toISOString().slice(0, 10), name, amount, possibleDefillamaId: Number(protocolNames[name.toLowerCase()])})))
}

main()
// Run it with
// npx ts-node src/cli/findUntaggedRaises.ts > unmatched.txt