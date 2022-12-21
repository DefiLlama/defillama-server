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

  let pricesRes = await sdk.api2.abi.multiCall({
    calls: pools.map((i: string, idx) => ({ target: i, params: params[idx].toString() })),
    abi: abis.sellFYTokenPreview,
    chain: chain as any, block,
  })

  pricesRes.map((output, i) => {
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
  sellFYTokenPreview: { "inputs": [{ "internalType": "uint128", "name": "fyTokenIn", "type": "uint128" }], "name": "sellFYTokenPreview", "outputs": [{ "internalType": "uint128", "name": "", "type": "uint128" }], "stateMutability": "view", "type": "function" },
  pools: { "inputs": [{ "internalType": "bytes6", "name": "", "type": "bytes6" }], "name": "pools", "outputs": [{ "internalType": "contract IJoin", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  IlkAdded: { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "bytes6", "name": "seriesId", "type": "bytes6" }, { "indexed": true, "internalType": "bytes6", "name": "ilkId", "type": "bytes6" }], "name": "IlkAdded", "type": "event" },
}