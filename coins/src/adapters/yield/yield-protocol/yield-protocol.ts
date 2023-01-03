import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import getBlock from "../../utils/block";
import { getLogs } from "../../../utils/cache/getLogs";
import * as sdk from '@defillama/sdk'
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

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { ladle, fromBlock, } = config[chain]
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);
  const cauldron = await sdk.api2.abi.call({
    target: ladle,
    abi: 'address:cauldron',
    chain: chain as any, block,
  })

  const logs = await getLogs({
    chain, target: cauldron, fromBlock, timestamp,
    topic: 'IlkAdded(bytes6,bytes6)'
  })

  let iface = new ethers.utils.Interface([abis.IlkAdded])
  let parsedLogs = logs.map((log: any) => (iface.parseLog(log)).args)
  const seriesIds = parsedLogs.map((i: any) => i.seriesId)

  let pools = await sdk.api2.abi.multiCall({
    target: ladle,
    calls: seriesIds,
    abi: abis.pools,
    chain: chain as any, block,
  })
  pools = [...new Set(pools)]
  const fyTokens = await sdk.api2.abi.multiCall({
    calls: pools,
    abi: 'address:fyToken',
    chain: chain as any, block,
  })
  const underlyingTokens = await sdk.api2.abi.multiCall({
    calls: pools,
    abi: 'address:base',
    chain: chain as any, block,
  })

  const tokenInfos = await getTokenInfo(chain, fyTokens, block)

  const params = tokenInfos.decimals.map(i => 10 ** i.output)
  let coinsData: CoinData[] = await getTokenAndRedirectData(underlyingTokens, chain, timestamp);

  let maturites = await sdk.api2.abi.multiCall({
    calls: pools,
    abi: abis.maturity,
    chain: chain as any, block,
  })
  let pricesRes: any = []
  let sellCalls: any = []
  let unwrapCalls: any = []
  const currentTime = timestamp === 0 ? Math.floor(Date.now() / 1e3) : timestamp
  maturites.forEach((value, idx) => {
    const call = { target: pools[idx], params: params[idx].toString() }
    // if (value < timestamp)  unwrapCalls.push(call)
    if (value < currentTime)  pricesRes[idx] = params[idx]
    else sellCalls.push(call)
  })

  let sellRes = await sdk.api2.abi.multiCall({
    calls: sellCalls,
    abi: abis.sellFYTokenPreview,
    chain: chain as any, block,
    withMetadata: true,
  })
  // let unwrapRes = await sdk.api2.abi.multiCall({
  //   calls: unwrapCalls,
  //   abi: abis.unwrapPreview,
  //   chain: chain as any, block,
  //   withMetadata: true,
  // })

  pools.forEach((pool, idx) => {
    const sellPrice = sellRes.find(i => i.input.target === pool)?.output
    // const unwrapPrice = unwrapRes.find(i => i.input.target === pool)?.output
    pricesRes[idx] = pricesRes[idx] || sellPrice
  })


  pricesRes.map((output: any, i: number) => {
    const coinData: (CoinData|undefined) = coinsData.find(
      (c: CoinData) => c.address.toLowerCase() === underlyingTokens[i].toLowerCase()
    );
    if (!coinData || !output) return;
    const price = coinData.price * output / params[i]

    addToDBWritesList(writes, chain, fyTokens[i], price, tokenInfos.decimals[i].output, tokenInfos.symbols[i].output, timestamp, 'yield-protocol', coinData.confidence as number)
  });

  return writes
}

const abis = {
  sellFYTokenPreview: "function sellFYTokenPreview(uint128 fyTokenIn) view returns (uint128)",
  unwrapPreview: "function unwrapPreview(uint256 shares) view returns (uint256)",
  pools: "function pools(bytes6) view returns (address)",
  maturity: "uint32:maturity",
  IlkAdded: { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes6", "name": "seriesId", "type": "bytes6" }, { "indexed": true, "internalType": "bytes6", "name": "ilkId", "type": "bytes6" }], "name": "IlkAdded", "type": "event" },
}
