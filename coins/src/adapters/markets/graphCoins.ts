
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
import { graph } from "@defillama/sdk"

function getGraphCoinsAdapter({ chain, endpoint, minVolume = 1e4, minTVL = 1e5, projectName = 'graph-coins' }: { chain: string, endpoint: string, minVolume?: number, minTVL?: number, projectName?: string }) {
  return async function adapter(timestamp: number = 0) {
    const chainApi = await getApi(chain, timestamp);
    const block = await chainApi.getBlock();
    const query = `{
  tokens (where: {
    derivedUSD_gt: 0
    volumeUSD_gt: ${minVolume}
    totalValueLockedUSD_gt: ${minTVL}
  } block: {number: ${block - 100}}) {
    id
    symbol
    poolCount
    derivedUSD
    totalValueLockedUSD
    volumeUSD
    feesUSD
    protocolFeesUSD
    decimals
    symbol
  }
}`
    const { tokens } = await graph.request(endpoint, query);
    const pricesObject: any = {}
    tokens.forEach((token: any) => {
      pricesObject[token.id] = {
        price: token.derivedUSD,
        symbol: token.symbol,
        decimals: token.decimals,
      }
    })
    return getWrites({ chain, timestamp, pricesObject, projectName, });
  }
}

export const adapters = {} as any;

const items = [
  { chain: 'ace', endpoint: 'https://endurance-subgraph-v2.fusionist.io/subgraphs/name/catalist/exchange-v3-v103', minTVL: 1e4, projectName: 'catalist' },
]

items.forEach((config: any) => adapters[config.projectName] = getGraphCoinsAdapter(config));