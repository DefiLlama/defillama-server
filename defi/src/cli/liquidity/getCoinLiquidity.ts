import PromisePool from "@supercharge/promise-pool/dist";
import fetch from "node-fetch";
import { getChainDisplayName } from "../../utils/normalizeChain";
import { platformMap } from "../../utils/coingeckoPlatforms";

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
//getLiquidityProtocols()

const toCsv = (rows:(string|number)[][])=>rows.map(row=>row.map(v=>`"${v}"`).join(",")).join("\n")
async function getLiquidityProtocolsCompare() {
    const [protocols, pools, config, cgCoins] = await Promise.all([
        fetch(`https://api.llama.fi/protocols`).then(r => r.json()),
        fetch(`https://yields.llama.fi/pools`).then(r => r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r => r.json()),
        fetch(`https://api.coingecko.com/api/v3/coins/list?include_platform=true`).then(r => r.json())
    ])
    const dexPools = (pools.data as any[]).filter(
        (p) => config.protocols[p.project]?.category === "Dexes")
    const liqByProtocol = protocols
        //.filter((p:any)=>p.symbol==="QI")
        .map((p: any) => {
        if (p.symbol === "-" || p.symbol === null || !p.address) {
            return
        }
        const tokenPoolsSymbol = dexPools.filter(pool =>
            pool.symbol.toUpperCase().split("-").includes(p.symbol?.toUpperCase())
        )
        const cgInfo = cgCoins.find((t:any)=>t.id===p.gecko_id)
        const chainAddress = getChainDisplayName(p.address.includes(":")?p.address.split(":")[0]:"ethereum", true)
        const rawAddress = (p.address.includes(":")?p.address.split(":")[1]:p.address).trim().toLowerCase() as string
        const addresses = {
            [chainAddress]: [rawAddress]
        }
        Object.entries(cgInfo?.platforms ?? {}).forEach(([chain, geckoAddress])=>{
            const rawChain = platformMap[chain]
            if(!rawChain){ return }
            const normalizedChainName = getChainDisplayName(rawChain, true)
            addresses[normalizedChainName] = (addresses[normalizedChainName] ?? []).concat([(geckoAddress as string).toLowerCase()])
        })
        const tokenPoolsAddress = dexPools.filter(pool =>{
            if(pool.underlyingTokens){
                return pool.underlyingTokens?.map((t:any)=>t.toLowerCase()).some((addy:string)=>(addresses[pool.chain] ?? []).includes(addy))
            } else {
                return pool.symbol.toUpperCase().split("-").includes(p.symbol?.toUpperCase())
            }
        })
        const tokenPoolsAddressOld = dexPools.filter(pool =>{
            if(pool.underlyingTokens){
                const addresses = Object.values(cgInfo?.platforms ?? {})
                    .concat([(p.address.includes(":")?p.address.split(":")[1]:p.address).trim()])
                    .map((a:any)=>a.toLowerCase())
                return pool.underlyingTokens?.map((t:any)=>t.toLowerCase()).some((addy:string)=>addresses.includes(addy))
            } else {
                return pool.symbol.toUpperCase().split("-").includes(p.symbol?.toUpperCase())
            }
        })
        /*
        console.log(tokenPoolsAddress, Object.values(cgInfo?.platforms ?? {})
        .concat([(p.address.includes(":")?p.address.split(":")[1]:p.address).trim()])
        .map((a:any)=>a.toLowerCase()))
        */
        //console.log(tokenPoolsSymbol.sort((a,b)=>b.tvlUsd-a.tvlUsd), tokenPoolsAddress.sort((a,b)=>b.tvlUsd-a.tvlUsd))
        const biggestPool = tokenPoolsSymbol.sort((a,b)=>b.tvlUsd-a.tvlUsd)[0]
        const biggestPoolAddress = tokenPoolsAddress.sort((a,b)=>b.tvlUsd-a.tvlUsd)[0]
        if(biggestPoolAddress?.symbol && !biggestPoolAddress?.symbol.includes(p.symbol.toUpperCase())){
            //console.log("sussy", p.name, p.symbol, biggestPoolAddress.symbol)
        }
        return [p.name, p.symbol, tokenPoolsSymbol.length, tokenPoolsAddress.length, biggestPool?.symbol, biggestPoolAddress?.symbol, 
            tf(tokenPoolsSymbol.reduce((sum, curr) => sum + curr.tvlUsd, 0) / 1e6), tf(tokenPoolsAddress.reduce((sum, curr) => sum + curr.tvlUsd, 0) / 1e6),
            tf(tokenPoolsAddressOld.reduce((sum, curr) => sum + curr.tvlUsd, 0) / 1e6)]
    }).filter(Boolean).sort((a: any, b: any) => b[6] - a[6])
    console.log(toCsv(liqByProtocol))
}
getLiquidityProtocolsCompare()

async function getLiquidityProtocolsCompared() {
    const chainToId = {
        ethereum: 'https://api.0x.org/',
        bsc: 'https://bsc.api.0x.org/',
        polygon: 'https://polygon.api.0x.org/',
        optimism: 'https://optimism.api.0x.org/',
        arbitrum: 'https://arbitrum.api.0x.org/',
        avax: 'https://avalanche.api.0x.org/',
        fantom: 'https://fantom.api.0x.org/',
        celo: 'https://celo.api.0x.org/'
    } as any;
    const inchChainToId = {
        ethereum: 1,
        bsc: 56,
        polygon: 137,
        optimism: 10,
        arbitrum: 42161,
        gnosis: 100,
        avax: 43114,
        fantom: 250,
        kaia: 8217,
        aurora: 1313161554
} as any;



    const protocols = await fetch(`https://api.llama.fi/protocols`).then(r => r.json())
    const [pools, config] = await Promise.all([
        fetch(`https://yields.llama.fi/pools`).then(r => r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r => r.json())
    ])
    const dexPools = (pools.data as any[]).filter(
        (p) => config.protocols[p.project]?.category === "Dexes")
    console.log("name, symbol, tvl, # pools, our liq, agg liq, biggestPool, biggestPool tvl")
    const protocolList = (protocols as any[]).filter((p: any) => p.symbol !== "-" && p.symbol !== null).map((p:any)=>{
        const tokenPools = dexPools.filter(pool =>
            pool.symbol.toUpperCase().split("-").includes(p.symbol)
        )
        const total = tokenPools.reduce((sum, curr) => sum + curr.tvlUsd, 0) / 1e6
        const biggestPool = tokenPools.sort((a,b)=>b.tvlUsd-a.tvlUsd)[0]
        return {p, total, biggestPool, poolsLength: tokenPools.length}
    })
    const liqByProtocol = await PromisePool.for(protocolList.filter(p=>p.total>0).sort((a:any,b)=>b.total-a.total)
        ).withConcurrency(3).process(async ({p, total, biggestPool, poolsLength}) => {
        const chain = p.address.includes(":")?p.address.split(":")[0]:"ethereum";
        const address = (p.address.includes(":")?p.address.split(":")[1]:p.address).trim();
        if(!chainToId[chain]){
            return
        }
        try{
        let aggAmount, aggregatorReturns;
        try{
        const data = await fetch(
            `${
                    chainToId[chain as any]
            }swap/v1/quote?buyToken=${address}&sellAmount=${
                "10000000"+"000000000000000000" // 10M eth ~18bn
            }&sellToken=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&slippagePercentage=${
                    0.5 / 100
            }&enableSlippageProtection=false&intentOnFilling=true&skipValidation=true`, {
                headers: {
                        '0x-api-key': process.env.OX_API_KEY!
                }
        }).then((r) => r.json());
        aggAmount = data?.buyAmount
        if(data.message || !aggAmount){
            const inch = await fetch(
                        `https://api.1inch.io/v4.0/${inchChainToId[chain]}/quote?fromTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&toTokenAddress=${address}&amount=${
                            "10000000"+"000000000000000000" // 10M eth ~18bn
                        }&slippage=${0.5}`).then(r => r.json()) // CHANGE FOR DEFILLAMA API
            //console.log(inch)
            aggAmount = inch.toTokenAmount
            if(!aggAmount){
                aggAmount = 0;
            }
        }
        const price = (await fetch(`https://coins.llama.fi/prices/current/${chain}:${address}`).then(r => r.json())).coins[`${chain}:${address}`]

        aggregatorReturns = aggAmount * price.price/(10**price.decimals)
        if(Number.isNaN(aggregatorReturns)){
            console.log(p.symbol, `${chain}:${address}`, data?.buyAmount, price, data)
        }
        } catch(e){
            aggregatorReturns=0
        }
        //console.log(p.symbol, tf(aggregatorReturns/1e6), tf(total/2))
        const values = [p.name, p.symbol, tf(p.tvl/1e6), poolsLength, tf(total/2), tf(aggregatorReturns/1e6), biggestPool?.symbol, tf(biggestPool?.tvlUsd/1e6)]
        console.log(values.map(v=>`"${v}"`).join(","))
        return values
        } catch(e){
            //console.log(chain, address, p, e)
            throw e
        }
    })
    //console.log("errors", liqByProtocol.errors)
    console.table(liqByProtocol.results.filter(Boolean).sort((a: any, b: any) => Number(b[3]) - Number(a[3])))
}
//getLiquidityProtocolsCompared()