import fetch from "node-fetch";

async function main(){
    const protocols = ((await fetch(`https://api.llama.fi/protocols`).then(r => r.json())) as any[]).filter(p => p.symbol !== "-")
    const repeatedSymbols = new Set(protocols
        .filter((item, index, arr) => {
            const dupIndex = arr.findIndex(itm => itm.symbol === item.symbol && (item.parentProtocol !== itm.parentProtocol || item.parentProtocol === undefined))
            return dupIndex !== -1 && dupIndex !== index
        })
        .map(p => p.symbol))
    const badProtocols = Array.from(repeatedSymbols).map(symbol=>{
        const pp = protocols.filter(p=>p.symbol === symbol).sort((a,b)=>a.tvl-b.tvl)
        return [pp[0].name, symbol, pp[1].name]
    })
    console.table(badProtocols)
}
main()