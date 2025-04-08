
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";
import { graph, } from "@defillama/sdk"

type BlockQueryArgs = {
  block: number;
  minVolume?: number
  minTVL?: number
}

const defaultQuery = ({ block, minVolume = 100, minTVL = 100 }: BlockQueryArgs) => `{
  tokens (where: {
    volumeUSD_gt: ${minVolume}
    totalValueLockedUSD_gt: ${minTVL}
  } block: {number: ${block - 100}} first: 1000) {
    id
    symbol
    poolCount
    totalValueLockedUSD
    totalValueLocked
    volumeUSD
    decimals
    symbol
  }
}`

function getGraphCoinsAdapter({ chain, endpoint, minVolume = 1e4, minTVL = 1e5, projectName = 'graph-coins', query = defaultQuery }: { chain: string, endpoint: string, minVolume?: number, minTVL?: number, projectName?: string, query?: (args: BlockQueryArgs) => string }) {
  async function adapter(timestamp: number = 0) {
    const chainApi = await getApi(chain, timestamp);
    const block = await chainApi.getBlock();
    const queryString = query({ block, minVolume, minTVL });
    const { tokens } = await graph.request(endpoint, queryString);
    const pricesObject: any = {}
    tokens.forEach((token: any) => {
      if (token.totalValueLockedUSD > 51 * 1e6) {
        console.log(`coin: ${token.id} has too high TVL (${Number(token.totalValueLockedUSD / 1e6).toFixed(2)}M), skipping`)
        return;
      }
      let price = token.totalValueLockedUSD / token.totalValueLocked
      let underlying: any = undefined
      if (!price && token.derivedETH) {
        price = token.derivedETH
        underlying = '0x0000000000000000000000000000000000000000'
      }
      pricesObject[token.id] = {
        price,
        underlying,
        symbol: token.symbol,
        decimals: token.decimals,
      }
    })
    return getWrites({ chain, timestamp, pricesObject, projectName, });
  }

  async function beraswapAdapter(timestamp: number = 0) {
    const chainApi = await getApi(chain, timestamp);
    const block = await chainApi.getBlock();
    const queryString = beraswapQuery({ block, });
    const { pools } = await graph.request(endpoint, queryString);

    const pricesObject: any = {}
    pools.forEach((token: any) => {
      let price = token.totalLiquidity / token.totalShares
      pricesObject[token.address] = { price, }
    })
    return getWrites({ chain, timestamp, pricesObject, projectName, });
  }

  switch (projectName) {
    case 'beraswap': return beraswapAdapter;
  }

  return adapter;
}

export const adapters = {} as any;

const taraswapQuery = ({ block, }: BlockQueryArgs) => `{
  tokens (where: {
    derivedETH_gt: 0
    volumeUSD_gt: 1000
    totalValueLockedUSD_gt: 1000
  } block: {number: ${block - 100}} first: 1000) {
    id
    symbol
    derivedETH
    decimals
    symbol
  }
}`

const beraswapQuery = ({ block, }: BlockQueryArgs) => `query SFPMChunks {
  pools ( 
    block: {number: ${block - 100}}
    first:1000 where: {
    totalLiquidity_gt: 50000
    totalSwapFee_gt: 100
  } orderBy: totalLiquidity orderDirection:desc) {
    id
    totalSwapFee
    totalLiquidity
    swapsCount
    address
    name
    symbol
    totalShares
  }
}`

const items = [
  { chain: 'ace', endpoint: 'https://endurance-subgraph-v2.fusionist.io/subgraphs/name/catalist/exchange-v3-v103', minTVL: 1e4, projectName: 'catalist' },
  { chain: 'vana', endpoint: 'https://api.goldsky.com/api/public/project_clnbo3e3c16lj33xva5r2aqk7/subgraphs/data-dex-vana/prod/gn', minTVL: 1e4, projectName: 'datadex' },
  { chain: 'tara', endpoint: 'https://indexer.lswap.app/subgraphs/name/taraxa/uniswap-v3', minTVL: 1e4, projectName: 'taraswap', },
  { chain: 'berachain', endpoint: 'https://api.goldsky.com/api/public/project_clq1h5ct0g4a201x18tfte5iv/subgraphs/bex-subgraph/mainnet-v1.0.1/gn', projectName: 'beraswap', },
]

items.forEach((config: any) => adapters[config.projectName] = getGraphCoinsAdapter(config));