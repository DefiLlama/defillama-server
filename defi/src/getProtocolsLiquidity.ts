import protocols from "./protocols/data";
import parentProtocols from "./protocols/parentProtocols";
import { IParentProtocol, Protocol } from "./protocols/types";
import { cache20MinResponse, wrap, IResponse } from "./utils/shared";

export function getLiquidityPoolsOfProtocol(p:IParentProtocol | Protocol, dexPools:any[], cgCoins:any){
    if("wrongLiquidity" in p && p.wrongLiquidity === true){
        return
    }
    let symbol:string|undefined, address:string|undefined|null;
    if("symbol" in p){
        symbol = p.symbol
        address = p.address
    } else {
        const children = protocols.filter((child) => child.parentProtocol === p.id)
        symbol = children.find((child) => child.symbol)?.symbol
        address = children.find((child) => child.address)?.address
    }
    if (symbol === "-" || symbol === null || symbol === undefined || !address) {
        return
    }
    const cgInfo = cgCoins.find((t:any)=>t.id===p.gecko_id)
    const tokenPools = dexPools.filter(pool =>{
        if(pool.underlyingTokens){
            const addresses = Object.values(cgInfo?.platforms ?? {})
                .concat([(address!.includes(":")?address!.split(":")[1]:address!).trim()])
                .map((a:any)=>a.toLowerCase())
            return pool.underlyingTokens?.map((t:any)=>t.toLowerCase()).some((addy:string)=>addresses.includes(addy))
        } else {
            return pool.symbol.toUpperCase().split("-").includes(symbol?.toUpperCase())
        }
    })
    const totalLiq = tokenPools.reduce((sum, curr) => sum + curr.tvlUsd, 0)
    return {
        id: p.id,
        symbol,
        tokenPools,
        totalLiq
    }
}

export async function getDexPools(){
    const [pools, config, cgCoins] = await Promise.all([
        fetch(`https://yields.llama.fi/pools`).then(r => r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r => r.json()),
        fetch(`https://api.coingecko.com/api/v3/coins/list?include_platform=true`).then(r => r.json())
    ])
    const dexPools = (pools.data as any[]).filter(
        (p) => config.protocols[p.project]?.category === "Dexes")
    return {dexPools, cgCoins}
}

const handler = async (): Promise<IResponse> => {
    const allProtocols = (parentProtocols as (typeof parentProtocols[0] | typeof protocols[0])[]).concat(protocols)
    const {dexPools, cgCoins} = await getDexPools()
    const liqByProtocol = allProtocols.map((p) => getLiquidityPoolsOfProtocol(p, dexPools, cgCoins))
        .filter(p=>p?.totalLiq > 0).sort((a: any, b: any) => b.totalLiq - a.totalLiq)

    return cache20MinResponse(liqByProtocol)
}

export default wrap(handler);