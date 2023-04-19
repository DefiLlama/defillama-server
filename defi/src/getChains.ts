import { successResponse, wrap, IResponse } from "./utils/shared";
import protocols from "./protocols/data";
import { getLastRecord, hourlyTvl } from './utils/getLastRecord'
import { getChainDisplayName, chainCoingeckoIds, isDoubleCounted, isExcludedFromChainTvl } from "./utils/normalizeChain";
import { excludeProtocolInCharts } from "./storeGetCharts";
import { IChain } from "./types";
import { importAdapter } from "./utils/imports/importAdapter";

export async function craftChainsResponse(excludeDoublecountedAndLSD = false){
  const chainTvls = {} as {[chain:string]:number}
  await Promise.all(
    protocols.map(async (protocol) => {
      if(excludeProtocolInCharts(protocol) || isExcludedFromChainTvl(protocol.category)){
        return undefined;
      }
      const lastTvl = await getLastRecord(hourlyTvl(protocol.id))
      if(lastTvl === undefined){
          return
      }
      const module = await importAdapter(protocol);
      if(excludeDoublecountedAndLSD && (protocol.category === "Liquid Staking" || isDoubleCounted(module.doublecounted, protocol.category)  === true)){
        return
      }
      let chainsAdded = 0
      Object.entries(lastTvl).forEach(([chain, chainTvl])=>{
          const chainName = getChainDisplayName(chain, false)
          if(chainCoingeckoIds[chainName] === undefined){
              return
          }
          chainTvls[chainName] = (chainTvls[chainName] ?? 0) + chainTvl
          chainsAdded += 1;
      })
      if(chainsAdded === 0){
        const chainName = protocol.chain
        chainTvls[chainName] = (chainTvls[chainName] ?? 0) + lastTvl.tvl
      }
    })
  );
  const chainData: IChain[] = Object.entries(chainTvls).map(([chainName, chainTvl])=>({
    gecko_id: chainCoingeckoIds[chainName]?.geckoId ?? null,
    tvl: chainTvl,
    tokenSymbol: chainCoingeckoIds[chainName]?.symbol ?? null,
    cmcId: chainCoingeckoIds[chainName]?.cmcId ?? null,
    name: chainName,
    chainId: chainCoingeckoIds[chainName]?.chainId ?? null,
  }))
  return chainData
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chainData = await craftChainsResponse(event.path === "/v2/chains")
  return successResponse(chainData, 10 * 60); // 10 mins cache
};

export default wrap(handler);
