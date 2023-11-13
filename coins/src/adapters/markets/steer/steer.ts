import { Write, } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList, getTokenAndRedirectData } from "../../utils/database";
import { request } from "graphql-request";

export const supportedChains = [
    {   
        name: 'Polygon', 
        subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/steerprotocol/steer-protocol-polygon',
        chainId: 137,
        merkl: true,
        identifier: 'polygon'
    },
    {
        name: 'Arbitrum',
        subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/steerprotocol/steer-protocol-arbitrum',
        chainId: 42161,
        merkl: true,
        identifier: 'arbitrum'
    },
    {
        name: 'Optimism',
        subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/steerprotocol/steer-protocol-optimism',
        chainId: 10,
        merkl: true,
        identifier: 'optimism'
    },
    {
        name: 'Binance',
        subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/steerprotocol/steer-protocol-bsc',
        chainId: 56,
        merkl: false,
        identifier: 'bsc'
    },
    {
        name: 'Evmos',
        subgraphEndpoint: 'https://subgraph.satsuma-prod.com/769a117cc018/steer/steer-protocol-evmos/api',
        chainId: 9001,
        merkl: false,
        identifier: 'evmos'
    },
    {
        name: 'Avalanche',
        subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/rakeshbhatt10/avalance-test-subgraph',
        chainId: 43114,
        merkl: false,
        identifier: 'avax'
    },
    {
        name: 'Thundercore',
        subgraphEndpoint: 'http://52.77.49.1:8000/subgraphs/name/steerprotocol/steer-thundercore',
        chainId: 108,
        merkl: false,
        identifier: 'thundercore'
    },
    {
        name: 'Kava',
        subgraphEndpoint: 'https://subgraph.steer.finance/kava/subgraphs/name/steerprotocol/steer-kava-evm',
        chainId: 2222,
        merkle: false,
        identifier: 'kava'
    },
    {
        name: 'Base',
        subgraphEndpoint: 'https://subgraph.satsuma-prod.com/769a117cc018/steer/steer-protocol-base/api',
        chainId: 8453,
        merkle: false,
        identifier: 'base'
    },
    // {
    //   name: 'Linea',
    //   subgraphEndpoint: 'https://subgraph.steer.finance/linea/subgraphs/name/steerprotocol/steer-linea/graphql',
    //   chainId: 59144,
    //   merkle: false,
    //   identifier: 'linea'
    // },
    {
        name: 'Metis',
        subgraphEndpoint: 'https://subgraph.satsuma-prod.com/769a117cc018/steer/steer-protocol-metis/api',
        chainId: 1088,
        merkle: false,
        identifier: 'metis'
    },
    // {
    //   name: 'Manta',
    //   subgraphEndpoint: 'https://subgraph.steer.finance/manta/subgraphs/name/steerprotocol/steer-manta/graphql',
    //   chainId: 169,
    //   merkle: false,
    //   identifier: 'manta'
    // },
    // {
    //   name: 'PolygonZKEVM',
    //   subgraphEndpoint: 'https://subgraph.steer.finance/zkevm/subgraphs/name/steerprotocol/steer-zkevm',
    //   chainId: 1101,
    //   merkle: false,
    //   identifier: 'polyzkevm'
    // },
    // {
    //   name: 'Scroll',
    //   subgraphEndpoint: 'https://subgraph.steer.finance/scroll/subgraphs/name/steerprotocol/steer-scroll/graphql',
    //   chainId: 534352,
    //   merkle: false,
    //   identifier: 'scroll'
    // },
    // {
    //   name: 'Celo',
    //   subgraphEndpoint: 'https://api.thegraph.com/subgraphs/name/rakeshbhatt10/steer-test-celo',
    //   chainId: 42220,
    //   merkle: false,
    //   identifier: 'celo'
    // },
]

export default async function getTokenPrices(chain: any, timestamp: number) {
    const api = await getApi(chain.identifier, timestamp)

    const query = `{vaults(first: 1000, where: {totalLPTokensIssued_not: "0", lastSnapshot_not: "0"}) {id}}`
    const data = await request(chain.subgraphEndpoint, query);
    
    const vaults =  data.vaults.map((vault) => vault.id)


    const writes: Write[] = [];
    await _getWrites()

    return writes

    async function _getWrites() {
    if (!vaults.length) return;
    const decimals = 18
    const [
        token0s, token1s, supplies, symbols, uBalances
    ] = await Promise.all([
        api.multiCall({ abi: 'address:token0', calls: vaults }),
        api.multiCall({ abi: 'address:token1', calls: vaults }),
        api.multiCall({ abi: 'uint256:totalSupply', calls: vaults }),
        api.multiCall({ abi: "string:symbol", calls: vaults }),
        api.multiCall({ abi: 'function getTotalAmounts() view returns (uint256 total0, uint256 total1)', calls: vaults }),
    ])
    const coinData = await getTokenAndRedirectData([...token0s, ...token1s], chain.identifier, timestamp)

    uBalances.forEach(({ token0Bal, token1Bal }: any, i: number) => {
        const t0Data = getTokenInfo(token0s[i])
        const t1Data = getTokenInfo(token1s[i])

        if (!t0Data || !t1Data) return;

        const t0Value = (t0Data.price * token0Bal) / (10 ** decimals)
        const t1Value = (t1Data.price * token1Bal) / (10 ** decimals)
        const price = (t0Value + t1Value) / (supplies[i] / (10 ** decimals))
        const t0confidence = t0Data.confidence ?? 0.8
        const t1confidence = t1Data.confidence ?? 0.8
        const confidence = t0confidence < t1confidence ? t0confidence : t1confidence

        addToDBWritesList(writes, chain.identifier, vaults[i], price, decimals, symbols[i], timestamp, 'steer', confidence)
        })

        function getTokenInfo(token: string) {
        token = token.toLowerCase()
        return coinData.find(i => i.address.toLowerCase() === token)
        }
    }
}
