import fetch from "node-fetch";
import { wrap, IResponse, cache20MinResponse, errorResponse } from "./utils/shared";
import { getTimestampAtStartOfDay } from "./utils/date";
import { getDexPools, getLiquidityPoolsOfProtocol } from "./getProtocolsLiquidity";
import protocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";

async function historicalLiquidity(tokenPools:any[]){
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
  const protocolName = event.pathParameters?.token?.toLowerCase();
  const protocolData = protocols.concat(parentProtocols as any[]).find((prot) => sluggify(prot) === protocolName);
  if(protocolData === undefined){
    return errorResponse({message: "No protocol provided"})
  }
  const {dexPools, cgCoins} = await getDexPools()
  const tokenPools = await getLiquidityPoolsOfProtocol(protocolData, dexPools, cgCoins)
  if(!tokenPools?.tokenPools?.length || tokenPools?.tokenPools?.length === 0){
    return errorResponse({message: "No liquidity info available"})
  }
  const liquidity = await historicalLiquidity(tokenPools?.tokenPools ?? [])
  return cache20MinResponse(liquidity)
};

export default wrap(handler);