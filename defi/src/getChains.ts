import { successResponse, wrap, IResponse } from "./utils/shared";
import protocols, { _InternalProtocolMetadataMap, Protocol } from "./protocols/data";
import { getLastRecord, hourlyTvl } from './utils/getLastRecord'
import { getChainDisplayName, chainCoingeckoIds, } from "./utils/normalizeChain";
import { IChain, } from "./types";
import { excludeProtocolInCharts, } from "./utils/excludeProtocols";

async function _getLastHourlyRecord(protocol: Protocol) {
  return getLastRecord(hourlyTvl(protocol.id))
}

export async function craftChainsResponse(excludeDoublecountedAndLSD = false, useNewChainNames = false, {
  getLastHourlyRecord = _getLastHourlyRecord,
  protocolList = protocols,
} = {}) {
  const chainTvls = {} as { [chain: string]: number }
  await Promise.all(
    protocolList.map(async (protocol) => {
      const pMetadata = _InternalProtocolMetadataMap[protocol.id]
      if (!pMetadata) {
        console.error(`Protocol metadata not found for ${protocol.id}, skipping it`);
        return undefined;
      }
      const { category, isLiquidStaking, isDoublecounted } = pMetadata;
      if (excludeProtocolInCharts(category)) {
        return undefined;
      }
      const lastTvl = await getLastHourlyRecord(protocol)
      if (lastTvl === undefined) {
        return
      }
      const excludeTvl = excludeDoublecountedAndLSD && (isLiquidStaking || isDoublecounted)
      if (excludeTvl) return;
      let chainsAdded = 0
      Object.entries(lastTvl).forEach(([chain, chainTvl]) => {
        const chainName = getChainDisplayName(chain, useNewChainNames)
        if (chainCoingeckoIds[chainName] === undefined) {
          return
        }
        chainTvls[chainName] = (chainTvls[chainName] ?? 0) + chainTvl
        chainsAdded += 1;
      })
      if (chainsAdded === 0) { // for fetch adapters
        const chainName = protocol.chain
        chainTvls[chainName] = (chainTvls[chainName] ?? 0) + lastTvl.tvl
      }
    })
  );
  const chainData: IChain[] = Object.entries(chainTvls).map(([chainName, chainTvl]) => ({
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
  const chainData = await craftChainsResponse(event.path === "/v2/chains", event.path === "/v2/chains")
  return successResponse(chainData, 10 * 60); // 10 mins cache
};

export default wrap(handler);
