import * as sdk from "@defillama/sdk";
import { request, } from "graphql-request";
import {
  addToDBWritesList,
} from "../../utils/database";
import { Write, } from "../../utils/dbInterfaces";
import abi from "./abi.json";
import { getApi } from "../../utils/sdk";
import { getPoolValues } from "../../utils";
import getWrites from "../../utils/getWrites";
import { getLogs } from "../../../utils/cache/getLogs";

const vault: string = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
const nullAddress: string = "0x0000000000000000000000000000000000000000";

const gaugeFactories: { [chain: string]: string } = {
  ethereum: "0x4e7bbd911cf1efa442bc1b2e9ea01ffe785412ec",
  arbitrum: "0xb08e16cfc07c684daa2f93c70323badb2a6cbfd2",
  polygon: "0x3b8ca519122cdd8efb272b0d3085453404b25bd0",
  optimism: "0x2E96068b3D5B5BAE3D7515da4A1D2E52d08A2647",
  avax: "0xb08E16cFc07C684dAA2f93C70323BAdb2A6CBFd2",
  xdai: "0x809B79b53F18E9bc08A961ED4678B901aC93213a",
};

type PoolInfo = {
  balances: number[];
  tokens: string[];
};
export type TokenValues = {
  address: string;
  decimals: number;
  price: number;
  symbol: string;
};

const chainToEnum: any = {
  ethereum: 'MAINNET',
  fraxtal: 'FRAXTAL',
  polygon: 'POLYGON',
  polygon_zkevm: 'ZKEVM',
  xdai: 'GNOSIS',
  arbitrum: 'ARBITRUM',
  optimism: 'OPTIMISM',
  avax: 'AVALANCHE',
  base: 'BASE',
  mode: 'MODE',
  fantom: 'FANTOM',
}

async function getPoolIdsFromLogs(api: sdk.ChainApi, options: BalancerOptions) {
  const { poolConfig: { address, fromBlock } } = options
  console.log('getPoolIdsFromLogs', address, fromBlock)
  const logs = await getLogs({
    api,
    target: address,
    fromBlock,
    eventAbi: 'event PoolCreated(address indexed pool)',
    onlyArgs: true,
  })
  const pools = logs.map((log: any) => log.pool)
  const poolIds = await api.multiCall({ abi: 'function getPoolId() view returns (bytes32)', calls: pools, permitFailure: true, })
  console.log('poolIds', poolIds.length, logs.length, api.chain)
  return poolIds.filter((id: any) => id)
}

async function getPoolIds2(api: sdk.ChainApi, options?: BalancerOptions): Promise<string[]> {
  if (options) return getPoolIdsFromLogs(api, options)
  let addresses: string[] = [];
  const subgraph: string = 'https://api-v3.balancer.fi/graphql'
  let hasMore = true
  let skip = 0
  let size = 1000
  const chainEnum = chainToEnum[api.chain]
  if (!chainEnum) throw new Error(`Chain ${api.chain} not supported`)

  do {
    const lpQuery = `
    query {
      poolGetPools (first: ${size} skip: ${skip} orderBy: totalLiquidity, orderDirection: desc,
          where: { chainIn:[${chainEnum}] minTvl: 10000 }) {
        id
      }
    }`;

    const { poolGetPools }: any = await request(subgraph, lpQuery);
    addresses.push(...poolGetPools.map((p: any) => p.id))
    hasMore = poolGetPools.length === size
  } while (hasMore)
  return addresses.filter((a: string) => {
    if (a.length < 44) {
      console.log('bad address', a)
      return false;
    }
    return true;
  })
}

type BalancerOptions = {
  poolConfig: {
    address: string,
    fromBlock: number,
  }
}

export async function getTokenPrices2(
  chain: string,
  timestamp: number,
  options?: BalancerOptions
): Promise<Write[]> {
  let writes: Write[] = [];
  const api = await getApi(chain, timestamp)
  const poolIds: string[] = await getPoolIds2(api, options);
  const poolTokens: PoolInfo[] = await api.multiCall({ abi: abi.getPoolTokens, target: vault, calls: poolIds, permitFailure: true, })
  const pools = (await api.multiCall({ abi: 'function getPool(bytes32) view returns (address pool, uint8)', target: vault, calls: poolIds, permitFailure: true, })).filter(i => i).map(i => i.pool)
  const poolData = {} as any
  pools.map((p: string, i: number) => {
    const balances = new sdk.Balances({ chain: api.chain, timestamp: api.timestamp })
    poolTokens[i].tokens.forEach((token, idx) => {
      if (token.toLowerCase() === pools[i].toLowerCase()) return;
      balances.add(token, poolTokens[i].balances[idx])
    })
    poolData[p] = balances
  })
  const poolValues = await getPoolValues({ api, pools: poolData, })
  const decimals = await api.multiCall({ abi: 'erc20:decimals', calls: pools, permitFailure: true, })
  const supplies = await api.multiCall({ abi: abi.getActualSupply, calls: pools, permitFailure: true })
  const supplies2 = await api.multiCall({ abi: 'erc20:totalSupply', calls: pools, permitFailure: true })
  const pricesObject: any = {}
  pools.forEach((pool: string, i: number) => {
    if (!poolValues[pool]) return;
    let supply = supplies[i] ?? supplies2[i]
    if (!supply) return;
    supply /= (10 ** decimals[i])
    const price = poolValues[pool] / supply
    if (poolValues[pool] > 1e10 || poolValues[pool] < 1e4) {
      if (poolValues[pool] > 1e10)
        console.log('bad balancer pool result? ignoring it', { pool, price, supply, value: poolValues[pool] })
      return;
    }
    if (price > 0 && price != Infinity) pricesObject[pool] = { price, supply: supplies[i] / 1e24, supplies2: supplies2[i] / 1e24, pool: pools[i], poolValue: poolValues[pool] / 1e6 }
  })


  const gaugeFactory = gaugeFactories[api.chain]

  if (gaugeFactory) {
    const whitelistedPools = Object.keys(pricesObject)
    const gauges = await api.multiCall({ abi: abi.getPoolGauge, calls: whitelistedPools, target: gaugeFactory, permitFailure: true })
    const decimals = await api.multiCall({ abi: 'erc20:decimals', calls: whitelistedPools, permitFailure: true })
    const symbols = await api.multiCall({ abi: 'erc20:symbol', calls: whitelistedPools, permitFailure: true })

    whitelistedPools.map((v: string, i: number) => {
      if (gauges[i] == nullAddress || !gauges[i] || !decimals[i]) return;
      addToDBWritesList(writes, chain, gauges[i], undefined, decimals[i], `${symbols[i]}-gauge`, timestamp, "balancer2-gauge", 0.9, `asset#${chain}:${v}`,);
    })
  }
  return getWrites({ pricesObject, chain: api.chain, timestamp: timestamp as any, writes, projectName: 'balancer2' })
}
