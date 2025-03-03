import { successResponse, wrap, IResponse } from "./utils/shared";
import protocols, { Protocol } from "./protocols/data";
import { getLastRecord, hourlyTvl } from './utils/getLastRecord'
import { getChainDisplayName, chainCoingeckoIds, isDoubleCounted, chainNameToIdMap } from "./utils/normalizeChain";
import { IChain, } from "./types";
import { importAdapter } from "./utils/imports/importAdapter";
import { excludeProtocolInCharts, isExcludedFromChainTvl } from "./utils/excludeProtocols";

async function _checkModuleDoubleCounted(protocol: Protocol) {
  const module = await importAdapter(protocol);
  return module.doublecounted
}

async function _getLastHourlyRecord(protocol: Protocol) {
  return getLastRecord(hourlyTvl(protocol.id))
}

export async function craftChainsResponse(excludeDoublecountedAndLSD = false, useNewChainNames = false, {
  checkModuleDoubleCounted = _checkModuleDoubleCounted,
  getLastHourlyRecord = _getLastHourlyRecord,
  protocolList = protocols,
} = {}) {
  const chainTvls = {} as { [chain: string]: { tvl: number, defillama_id: string } }
  await Promise.all(
    protocolList.map(async (protocol) => {
      if (excludeProtocolInCharts(protocol) || isExcludedFromChainTvl(protocol.category)) {
        return undefined;
      }
      const lastTvl = await getLastHourlyRecord(protocol)
      if (lastTvl === undefined) {
        return
      }
      const excludeTvl = excludeDoublecountedAndLSD && (protocol.category === "Liquid Staking" || isDoubleCounted(await checkModuleDoubleCounted(protocol), protocol.category) === true)
      if (excludeTvl) return;
      let chainsAdded = 0
      Object.entries(lastTvl).forEach(([chain, chainTvl]) => {
        const chainName = getChainDisplayName(chain, useNewChainNames)
        if (chainCoingeckoIds[chainName] === undefined) {
          return
        }
        if (!chainTvls[chainName]) {
          chainTvls[chainName] = { tvl: 0, defillama_id: chain }
        }
        chainTvls[chainName].tvl += chainTvl as number
        chainsAdded += 1;
      })
      if (chainsAdded === 0) { // for fetch adapters
        const chainName = protocol.chain
        if (!chainTvls[chainName]) {
          chainTvls[chainName] = { tvl: 0, defillama_id: chainNameToIdMap[chainName] }
        }
        chainTvls[chainName].tvl += lastTvl.tvl
      }
    })
  );
  const chainData: IChain[] = Object.entries(chainTvls).map(([chainName, chainData]) => ({
    gecko_id: chainCoingeckoIds[chainName]?.geckoId ?? null,
    tvl: chainData.tvl,
    tokenSymbol: chainCoingeckoIds[chainName]?.symbol ?? null,
    cmcId: chainCoingeckoIds[chainName]?.cmcId ?? null,
    name: chainName,
    chainId: chainCoingeckoIds[chainName]?.chainId ?? null,
    defillamaId: chainData.defillama_id,
  }))
  return chainData
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chainData = await craftChainsResponse(event.path === "/v2/chains", event.path === "/v2/chains")
  return successResponse(chainData, 10 * 60); // 10 mins cache
};

export default wrap(handler);
