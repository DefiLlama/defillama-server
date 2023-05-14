import fetch from "node-fetch";

const token = '0xc00e94cb662c3520282e6f5717214004a7f26888'

async function yields(){
    const pools = await fetch(`https://yields.llama.fi/pools`).then(r=>r.json())
    const config = await fetch(`https://api.llama.fi/config/yields?a=1`).then(r=>r.json())
    const tokenPools = (pools.data as any[]).filter(
        (p)=>config.protocols[p.project]?.category === "Dexes" 
            && p.underlyingTokens?.map((t:string)=>t.toLowerCase()).includes(token)
        )
    console.log("yields", tokenPools.length, tokenPools.reduce((sum, curr)=>sum + curr.tvlUsd, 0)/1e6)
    console.table(tokenPools.sort((a,b)=>a.tvlusd-b.tvlUsd).map(p=>[p.project, p.symbol, p.tvlUsd/1e3]))
}

async function historicalYields(){
    const pools = await fetch(`https://yields.llama.fi/pools`).then(r=>r.json())
    const config = await fetch(`https://api.llama.fi/config/yields?a=1`).then(r=>r.json())
    const tokenPools = (pools.data as any[]).filter(
        (p)=>config.protocols[p.project]?.category === "Dexes" 
            && p.underlyingTokens?.map((t:string)=>t.toLowerCase()).includes(token)
        )
    const historicalPoolInfo = await Promise.all(tokenPools.map(p=>fetch(`https://yields.llama.fi/chart/${p.pool}`).then(r=>r.json()).catch(e=>{
        console.error(`Failed to get pool ${p.pool}`, e)
        return {data:[]}
    })))
    const liquidity = {} as {
        [timestamp:string]:number
    }
    historicalPoolInfo.forEach(chart=>{
        chart.data.forEach((day:any)=>{
            const timestamp = Math.floor(new Date(day.timestamp).getTime()/1e3)
            liquidity[timestamp] = day.tvlUsd + (liquidity[timestamp] ?? 0)
        })
    })
    const liquidityArray = Object.entries(liquidity).sort((a:any,b:any)=>a[0]-b[0]).map(p=>[Number(p[0]), p[1]])
    console.log("liquidityArray", liquidityArray)
}

async function geckoterminal(){
    const pools = await fetch(`https://api.geckoterminal.com/api/v2/networks/eth/tokens/${token}/pools`).then(r=>r.json())
    console.log("geckoterminal", pools.data.length, (pools.data as any[]).reduce((sum, curr)=>sum+Number(curr.attributes.reserve_in_usd), 0)/1e6)
}
//yields()
//geckoterminal()
historicalYields()