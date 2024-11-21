import fetch from "node-fetch"

const main = async () => {
    const raises = await fetch(`https://api.llama.fi/raises`).then(r=>r.json())
    const tagged = {} as any
    const unmatchedRaises = raises.raises.filter((r:any)=> {
        const id = `${r.name}-${r.date}`
        if(tagged[id] === undefined){
            tagged[id] = true;
            return false
        } else {
            return true
        }
    })
    console.table(unmatchedRaises.sort((a:any,b:any)=>a.date-b.date).map(({date, name, amount}:any)=>({date:new Date(date*1e3).toISOString().slice(0, 10), name, amount})))
}

main()