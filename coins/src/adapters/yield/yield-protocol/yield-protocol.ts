import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import { getLogs } from "../../../utils/cache/getLogs";
import { getApi } from "../../utils/sdk";
import * as ethers from 'ethers'

const config = {
  arbitrum: {
    ladle: '0x16E25cf364CeCC305590128335B8f327975d0560',
    fromBlock: 31012,
  },
  ethereum: {
    ladle: '0x6cB18fF2A33e981D1e38A663Ca056c0a5265066A',
    fromBlock: 13461529,
  },
} as any

const custom = {
  ethereum: [getKLPsPrice, getCrabV2Price]
} as any

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { ladle, fromBlock, } = config[chain]
  const writes: Write[] = [];
  
  const api = await getApi(chain, timestamp)
  const block: number | undefined = await api.getBlock() as any
  if (custom[chain]) {
    await Promise.all(custom[chain].map((i: any) => i({ api, writes, timestamp })))
  }
  if (!ladle) return writes
  const cauldron = await api.call({
    target: ladle,
    abi: 'address:cauldron',
  })

  const logs = await getLogs({
    target: cauldron, fromBlock, api,
    topic: 'IlkAdded(bytes6,bytes6)'
  })

  let iface = new ethers.utils.Interface([abis.IlkAdded])
  let parsedLogs = logs.map((log: any) => (iface.parseLog(log)).args)
  const seriesIds = parsedLogs.map((i: any) => i.seriesId)

  let pools = await api.multiCall({
    target: ladle,
    calls: seriesIds,
    abi: abis.pools,
  })
  pools = [...new Set(pools)]
  const fyTokens = await api.multiCall({
    calls: pools,
    abi: 'address:fyToken',
  })
  const underlyingTokens = await api.multiCall({
    calls: pools,
    abi: 'address:base',
  })

  const tokenInfos = await getTokenInfo(chain, fyTokens, block)

  const params = tokenInfos.decimals.map(i => 10 ** i.output)
  let coinsData: CoinData[] = await getTokenAndRedirectData(underlyingTokens, chain, timestamp);

  let maturites = await api.multiCall({
    calls: pools,
    abi: abis.maturity,
  })
  let pricesRes: any = []
  let sellCalls: any = []
  const currentTime = timestamp === 0 ? Math.floor(Date.now() / 1e3) : timestamp
  maturites.forEach((value, idx) => {
    const call = { target: pools[idx], params: params[idx].toString() }
    if (value < currentTime) pricesRes[idx] = params[idx]
    else sellCalls.push(call)
  })

  let sellRes = await api.multiCall({
    calls: sellCalls,
    abi: abis.sellFYTokenPreview,
    withMetadata: true,
    permitFailure: true 
  })

  pools.forEach((pool, idx) => {
    const sellPrice = sellRes.find(i => i.input.target === pool)?.output
    pricesRes[idx] = pricesRes[idx] || sellPrice
  })


  pricesRes.map((output: any, i: number) => {
    const coinData: (CoinData | undefined) = coinsData.find(
      (c: CoinData) => c.address.toLowerCase() === underlyingTokens[i].toLowerCase()
    );
    if (!coinData || !output) return;
    const price = coinData.price * output / params[i]

    addToDBWritesList(writes, chain, fyTokens[i], price, tokenInfos.decimals[i].output, tokenInfos.symbols[i].output, timestamp, 'yield-protocol', coinData.confidence as number)
  });

  return writes
}

async function getKLPsPrice({ api, writes, timestamp }: any) {
  const token = '0x3f6740b5898c5D3650ec6eAce9a649Ac791e44D7'
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'.toLowerCase();
  const KP3R = '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44'.toLowerCase();
  const addresses = [KP3R, WETH];
  let coinsData: CoinData[] = await getTokenAndRedirectData(addresses, api.chain, api.timestamp);
  const wethPrice: any = coinsData.find((c: CoinData) => c.address.toLowerCase() === WETH)?.price
  const kp3rPrice: any = coinsData.find((c: CoinData) => c.address.toLowerCase() === KP3R)?.price
  const klpPrice = 2 * Math.sqrt(kp3rPrice / wethPrice) * wethPrice;

  const tokenInfos = await getTokenInfo(api.chain, [token], api.block)
  addToDBWritesList(writes, api.chain, token, klpPrice, tokenInfos.decimals[0].output, tokenInfos.symbols[0].output, timestamp, 'yield-protocol', coinsData.find((c: CoinData) => c.address.toLowerCase() === KP3R)?.confidence as number)
  return writes
}

async function getCrabV2Price({ api, writes, timestamp }: any) {
  const token = '0x3B960E47784150F5a63777201ee2B15253D713e8'
  const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'.toLowerCase();
  const sqeeth = '0xf1b99e3e573a1a9c5e6b2ce818b617f0e664e86b'.toLowerCase();
  const addresses = [sqeeth, WETH];
  const tokenSupply = await api.call({ target: token, abi: 'erc20:totalSupply' })
  const [_, _1, ethInCrab, squeethInCrab]: any = await api.call({
    target: token,
    abi: 'function getVaultDetails() view returns (address, uint256, uint256, uint256)'
  })

  let coinsData: CoinData[] = await getTokenAndRedirectData(addresses, api.chain, api.timestamp);
  const wethPrice: any = coinsData.find((c: CoinData) => c.address.toLowerCase() === WETH)?.price
  const sqeethPrice: any = coinsData.find((c: CoinData) => c.address.toLowerCase() === sqeeth)?.price
  const tokenInfos = await getTokenInfo(api.chain, [token], api.block)
  const decimals = tokenInfos.decimals[0].output
  const ethInVaultUSD = (ethInCrab * wethPrice - (squeethInCrab * (sqeethPrice )))
  const price =  ethInVaultUSD * (10 ** decimals) / (tokenSupply * 1e18);

  addToDBWritesList(writes, api.chain, token, price, decimals, tokenInfos.symbols[0].output, timestamp, 'yield-protocol', coinsData.find((c: CoinData) => c.address.toLowerCase() === sqeeth)?.confidence as number)
  return writes
}


const abis = {
  sellFYTokenPreview: "function sellFYTokenPreview(uint128 fyTokenIn) view returns (uint128)",
  unwrapPreview: "function unwrapPreview(uint256 shares) view returns (uint256)",
  pools: "function pools(bytes6) view returns (address)",
  maturity: "uint32:maturity",
  IlkAdded: 'event IlkAdded(bytes6 indexed seriesId, bytes6 indexed ilkId)'
}
