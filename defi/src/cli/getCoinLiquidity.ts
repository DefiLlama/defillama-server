import fetch from "node-fetch";

const token = '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2'
const symbol = 'SUSHI'

async function yields(){
    const pools = await fetch(`https://yields.llama.fi/pools`).then(r=>r.json())
    const config = await fetch(`https://api.llama.fi/config/yields`).then(r=>r.json())
    const tokenPools = (pools.data as any[]).filter(
        (p)=>config.protocols[p.project]?.category === "Dexes" 
            && p.underlyingTokens?.map((t:string)=>t.toLowerCase()).includes(token)
        )
    console.log("yields", tokenPools.length, tokenPools.reduce((sum, curr)=>sum + curr.tvlUsd, 0)/1e6)
    console.table(tokenPools.sort((a,b)=>a.tvlusd-b.tvlUsd).map(p=>[p.project, p.chain, p.symbol, p.tvlUsd/1e3]))
}
async function yieldSymbol(){
    const [pools, config] = await Promise.all([
        fetch(`https://yields.llama.fi/pools`).then(r=>r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r=>r.json())
    ])
    const tokenPools = (pools.data as any[]).filter(
        (p)=>config.protocols[p.project]?.category === "Dexes" 
            && p.symbol.includes(symbol)
        )
    console.log("yieldSymbol", tokenPools.length, tokenPools.reduce((sum, curr)=>sum + curr.tvlUsd, 0)/1e6)
    console.table(tokenPools.sort((a,b)=>a.tvlusd-b.tvlUsd).map(p=>[p.project, p.chain, p.symbol, p.tvlUsd/1e3]))
    const liquidityAggregated = tokenPools.reduce((agg, pool)=>{
        if(!agg[pool.project]) agg[pool.project] = {}
        agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
        return agg
    }, {} as any)
    console.table(Object.entries(liquidityAggregated).map(p=>Object.entries(p[1] as any).map(c=>[config.protocols[p[0]].name, c[0], c[1] as number/1e6])).flat().sort((a:any,b:any)=>b[2]-a[2]))
}

async function historicalYields(){
    const pools = await fetch(`https://yields.llama.fi/pools`).then(r=>r.json())
    const config = await fetch(`https://api.llama.fi/config/yields`).then(r=>r.json())
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
//yieldSymbol()
//historicalYields()


async function getLiquidity(symbol:string){
    const [pools, config] = await Promise.all([
        fetch(`https://yields.llama.fi/pools`).then(r=>r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r=>r.json())
    ])
    const tokenPools = (pools.data as any[]).filter(
        (p)=>config.protocols[p.project]?.category === "Dexes" 
            && p.symbol.toUpperCase().includes(symbol)
        )
    const liquidityAggregated = tokenPools.reduce((agg, pool)=>{
        if(!agg[pool.project]) agg[pool.project] = {}
        agg[pool.project][pool.chain] = pool.tvlUsd + (agg[pool.project][pool.chain] ?? 0)
        return agg
    }, {} as any)
    console.table(Object.entries(liquidityAggregated).map(p=>Object.entries(p[1] as any).map(c=>[config.protocols[p[0]].name, c[0], c[1] as number/1e6])).flat().sort((a:any,b:any)=>b[2]-a[2]))
}
//getLiquidity("SUSHI") // symbol needs to be uppercase

const tf = (n:number)=>Number(n.toFixed(2))
async function getLiquidityProtocols() {
    const protocols = await fetch(`https://api.llama.fi/protocols`).then(r => r.json())
    const [pools, config] = await Promise.all([
        fetch(`https://yields.llama.fi/pools`).then(r => r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r => r.json())
    ])
    const dexPools = (pools.data as any[]).filter(
        (p) => config.protocols[p.project]?.category === "Dexes")
    const liqByProtocol = protocols.map((p: any) => {
        if (p.symbol === "-" || p.symbol === null) {
            return
        }
        const tokenPools = dexPools.filter(pool =>
            pool.symbol.toUpperCase().split("-").includes(p.symbol)
        )
        const biggestPool = tokenPools.sort((a,b)=>b.tvlUsd-a.tvlUsd)[0]
        return [p.name, p.symbol, tokenPools.length, tf(tokenPools.reduce((sum, curr) => sum + curr.tvlUsd, 0) / 1e6), tf(p.tvl/1e6), biggestPool?.symbol]
    }).filter(Boolean).sort((a: any, b: any) => b[3] - a[3])
    console.table(liqByProtocol)
}
getLiquidityProtocols()