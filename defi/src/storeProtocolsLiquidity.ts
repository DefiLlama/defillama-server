import protocols from "./protocols/data";
import parentProtocols from "./protocols/parentProtocols";
import { IParentProtocol, Protocol } from "./protocols/types";
import { platformMap } from "./utils/coingeckoPlatforms";
import { getChainDisplayName } from "./utils/normalizeChain";
import { storeR2JSONString } from "./utils/r2";
import fetch from "node-fetch";
import { wrapScheduledLambda } from "./utils/shared/wrap";

interface BridgedCoins {
    [from:string]:string[]
}

function getLiquidityPoolsOfProtocol(p:IParentProtocol | Protocol, dexPools:any[], cgCoins:any, bridgedCoins:BridgedCoins){
    if("wrongLiquidity" in p && p.wrongLiquidity === true){
        return
    }
    let symbol:string|undefined|null, address:string|undefined|null;
    if("symbol" in p){
        symbol = p.symbol
        address = (p as any).address
    } else {
        const children = protocols.filter((child) => child.parentProtocol === p.id)
        symbol = children.find((child) => child.symbol)?.symbol
        address = children.find((child) => child.address)?.address
    }
    if (symbol === "-" || symbol === null || symbol === undefined || !address) {
        return
    }
    let gecko_id = p.gecko_id ?? parentProtocols.find(pp=>pp.id === (p as any).parentProtocol)?.gecko_id
    const cgInfo = cgCoins.find((t:any)=>t.id===gecko_id)
    const chainAddress = getChainDisplayName(address.includes(":")?address.split(":")[0]:"ethereum", true)
    const rawAddress = (address.includes(":")?address.split(":")[1]:address).trim().toLowerCase() as string
    const addresses = {
        [chainAddress]: [rawAddress]
    }
    Object.entries(cgInfo?.platforms ?? {}).forEach(([chain, geckoAddress])=>{
        const rawChain = platformMap[chain]
        if(!rawChain){ return }
        const normalizedChainName = getChainDisplayName(rawChain, true)
        addresses[normalizedChainName] = (addresses[normalizedChainName] ?? []).concat([(geckoAddress as string).toLowerCase()])
    })
    Object.entries(addresses).forEach(([chain, address])=>{
        const otherCoins = bridgedCoins[chain+':'+address] ?? []
        otherCoins.forEach(coin=>{
            const [coinChain, coinAddress] = coin.split(":")
            if(!(addresses[coinChain]??[]).includes(coinAddress)){
                addresses[coinChain] = (addresses[coinChain] ?? []).concat([coinAddress])
            }
        })
    })
    const tokenPools = dexPools.filter(pool =>{
        if(pool.underlyingTokens){
            return pool.underlyingTokens?.map((t:any)=>t.toLowerCase()).some((addy:string)=>(addresses[pool.chain] ?? []).includes(addy))
        } else if(symbol!.length > 2) {
            return pool.symbol.toUpperCase().split("-").includes(symbol?.toUpperCase())
        }
        return false
    })
    const totalLiq = tokenPools.reduce((sum, curr) => sum + curr.tvlUsd, 0)
    return {
        id: p.id,
        symbol,
        tokenPools,
        totalLiq,
    }
}

const excludedPools = [
    "38160634-07f7-4dcd-a26e-0e0d27ef5a1b", // CRV-cvxCRV
    "d33bbfb6-811c-4e80-9928-b96ebd7e136c", // CRV-cvxCRV
]

const transformChainName = (address:string)=>{
    const [chain, addy] = address.split(":")
    return getChainDisplayName(chain, true)+':'+addy
}

async function getDexPools(){
    const [pools, config, cgCoins, bridgedCoinsRaw] = await Promise.all([
        fetch(`https://yields.llama.fi/pools`).then(r => r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r => r.json()),
        fetch(`https://api.coingecko.com/api/v3/coins/list?include_platform=true`).then(r => r.json()),
        fetch(`https://defillama-datasets.llama.fi/bridgedTokens.json`).then(r => r.json())
    ])
    const bridgedCoins = {} as BridgedCoins
    bridgedCoinsRaw.flat().forEach(({from:fromRaw, to:toRaw}:any)=>{
        const from = transformChainName(fromRaw)
        const to = transformChainName(toRaw)
        if(!bridgedCoins[from]){bridgedCoins[from]=[]}
        if(!bridgedCoins[to]){bridgedCoins[to]=[]}
        bridgedCoins[from].push(to)
        bridgedCoins[to].push(from)
    })
    const dexPools = (pools.data as any[]).filter(
        (p) => config.protocols[p.project]?.category === "Dexes" && !excludedPools.includes(p.pool))
    return {dexPools, cgCoins, bridgedCoins}
}

const handler = async () => {
    const allProtocols = (parentProtocols as (typeof parentProtocols[0] | typeof protocols[0])[]).concat(protocols)
    const {dexPools, cgCoins, bridgedCoins} = await getDexPools()
    const liqByProtocol = allProtocols.map((p) => getLiquidityPoolsOfProtocol(p, dexPools, cgCoins, bridgedCoins))
        .filter(p=>p?.totalLiq > 0).sort((a: any, b: any) => b.totalLiq - a.totalLiq)

    await storeR2JSONString(`liquidity.json`, JSON.stringify(liqByProtocol), 60 * 60);
}

export default wrapScheduledLambda(handler);
