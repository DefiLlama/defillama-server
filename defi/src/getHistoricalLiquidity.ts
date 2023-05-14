import fetch from "node-fetch";
import { wrap, IResponse, cache20MinResponse, errorResponse } from "./utils/shared";

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
    return liquidityArray
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