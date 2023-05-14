import fetch from "node-fetch";
import { wrap, IResponse, cache20MinResponse, errorResponse } from "./utils/shared";
import { getTimestampAtStartOfDay } from "./utils/date";

async function historicalLiquidity(token:string){
    const [pools, config] = await Promise.all([
        fetch(`https://yields.llama.fi/pools`).then(r=>r.json()),
        fetch(`https://api.llama.fi/config/yields`).then(r=>r.json())
    ])
    const tokenPools = (pools.data as any[]).filter(
        (p)=>config.protocols[p.project]?.category === "Dexes" 
            && p.symbol.toUpperCase().split("-").includes(token)
        )
    const historicalPoolInfo = await Promise.all(tokenPools.map(p=>fetch(`https://yields.llama.fi/chart/${p.pool}`).then(r=>r.json()).catch(e=>{
        console.error(`Failed to get pool ${p.pool}`, e)
        return {data:[]}
    }).then(r=>({pool: p.pool, data:r.data}))))
    const liquidity = {} as {
        [timestamp:string]:{
            total:number,
            pools: {
                [pool:string]:number
            }   
        }
    }
    historicalPoolInfo.forEach(chart=>{
        chart.data.forEach((day:any)=>{
            const timestamp = getTimestampAtStartOfDay(new Date(day.timestamp).getTime()/1e3)
            if(!liquidity[timestamp]) liquidity[timestamp] = {total:0, pools:{}}
            if(liquidity[timestamp].pools[chart.pool] !== undefined) return // repeated pool, ignore second
            liquidity[timestamp].total += day.tvlUsd
            liquidity[timestamp].pools[chart.pool] = day.tvlUsd
        })
    })
    const liquidityArray = Object.entries(liquidity).sort((a:any,b:any)=>a[0]-b[0])
    const finalArray = [[Number(liquidityArray[0][0]), liquidityArray[0][1].total]]
    for(let i =1; i < liquidityArray.length; i++){
        const prev = liquidityArray[i-1][1]
        const curr = liquidityArray[i]
        let total = curr[1].total
        Object.entries(prev.pools).forEach(([pool, tvl])=>{
            if(!curr[1].pools[pool]){
                total+=tvl
            }
        })
        finalArray.push([Number(curr[0]), total])
    }
    return finalArray
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const token = event.pathParameters?.token?.toUpperCase();
  if(token === undefined){
    return errorResponse({message: "No token provided"})
  }
  const liquidity = await historicalLiquidity(token)
  return cache20MinResponse(liquidity)
};

export default wrap(handler);