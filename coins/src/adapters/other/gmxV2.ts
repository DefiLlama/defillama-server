import { getLogs } from "../../utils/cache/getLogs";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import * as ethers from 'ethers'
import axios from 'axios'

const config: any = {
  arbitrum: [
    { eventEmitter: '0xc8ee91a54287db53897056e12d9819156d3822fb', fromBlock: 107737756, gmReader: '0x38d91ED96283d62182Fc6d990C24097A918a4d9b', tickers: 'https://arbitrum-api.gmxinfra.io/prices/tickers' },
  ],
  avax: [
    { eventEmitter: '0xDb17B211c34240B014ab6d61d4A31FA0C0e20c26', fromBlock: 32162455, tickers: 'https://avalanche-api.gmxinfra.io/prices/tickers', gmReader: '0x73BA021ACF4Bb6741E82690DdB821e7936050f8C', },
  ], // TODO: re-enable it after upgrading avax rpc node
}

const chains = Object.keys(config)

export function gmxV2(timestamp: number = 0) {

  const THIRY_MINUTES = 1800
  if (+timestamp !== 0 && timestamp < (+new Date() / 1e3 - THIRY_MINUTES))
    throw new Error("Can't fetch historical data")

  return Promise.all(chains.map(i => getTokenPrices(i, timestamp)))
}

const abis = {
  getMarketTokenPrice: "function getMarketTokenPrice(address dataStore, tuple(address marketToken, address indexToken, address longToken, address shortToken) market, tuple(uint256 min, uint256 max) indexTokenPrice, tuple(uint256 min, uint256 max) longTokenPrice, tuple(uint256 min, uint256 max) shortTokenPrice, bytes32 pnlFactorType, bool maximize) view returns (int256, tuple(int256 poolValue, int256 longPnl, int256 shortPnl, int256 netPnl, uint256 longTokenAmount, uint256 shortTokenAmount, uint256 longTokenUsd, uint256 shortTokenUsd, uint256 totalBorrowingFees, uint256 borrowingFeePoolFactor, uint256 impactPoolAmount))",
  EventLog1: "event EventLog1(address msgSender, string eventName, string indexed eventNameHash, bytes32 indexed topic1, tuple(tuple(tuple(string key, address value)[] items, tuple(string key, address[] value)[] arrayItems) addressItems, tuple(tuple(string key, uint256 value)[] items, tuple(string key, uint256[] value)[] arrayItems) uintItems, tuple(tuple(string key, int256 value)[] items, tuple(string key, int256[] value)[] arrayItems) intItems, tuple(tuple(string key, bool value)[] items, tuple(string key, bool[] value)[] arrayItems) boolItems, tuple(tuple(string key, bytes32 value)[] items, tuple(string key, bytes32[] value)[] arrayItems) bytes32Items, tuple(tuple(string key, bytes value)[] items, tuple(string key, bytes[] value)[] arrayItems) bytesItems, tuple(tuple(string key, string value)[] items, tuple(string key, string[] value)[] arrayItems) stringItems) eventData)",
}

async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)

  const configs = config[chain]
  const writes: Write[] = [];
  for (const _config of configs)
    await _getWrites(_config)

  return writes

  async function _getWrites({ eventEmitter, fromBlock, gmReader, tickers }: any = {}) {
    const logs = await getLogs({
      api,
      target: eventEmitter,
      topics: ['0x137a44067c8961cd7e1d876f4754a5a3a75989b4552f1843fc69c3b372def160', '0xad5d762f1fc581b3e684cf095d93d3a2c10754f60124b09bec8bf3d76473baaf',], // need both else too many logs
      eventAbi: abis.EventLog1,
      onlyArgs: true,
      fromBlock,
    })
    const tickerData = await axios.get(tickers)
    const tickerDataObj = Object.fromEntries(tickerData.data.map((i: any) => [i.tokenAddress.toLowerCase(), i]))

    const underlyingTokens = logs.map((i: any) => {
      const [_, index, long, short] = i[4].addressItems.items.map((i: any) => i.value)
      return [index, long, short].map((i: any) => i.toLowerCase())
    }).flat()
    const coinData = await getTokenAndRedirectData(underlyingTokens, chain, timestamp)
    const coinDataObj = Object.fromEntries(coinData.map((i: any) => [i.address.toLowerCase(), i]))
    const symbols: string[] = []
    const marketTokens: string[] = []

    function getCallConfig(address: string) {
      address = address.toLowerCase()
      if (address === '0x0000000000000000000000000000000000000000') return { min: 0, max: 0 }
      let i = tickerDataObj[address]
      if (i) return { min: i.minPrice, max: i.maxPrice }
      i = coinDataObj[address]
      if (!i) return null
      const price = Math.floor(i.price * 1e12).toString()
      return { min: price, max: price }
    }

    const calls = logs.map((v: any) => {
      const [market, index, long, short] = v[4].addressItems.items.map((i: any) => i.value.toLowerCase())
      const indexConfig = getCallConfig(index)
      const longConfig = getCallConfig(long)
      const shortConfig = getCallConfig(short)
      if (!indexConfig || !longConfig || !shortConfig) {
        console.log('missing coin data', index, long, short, market)
        return;
      }

      // if (index === '0x0000000000000000000000000000000000000000') return; // skip for now, until non USDC base is handled correctly
      // if (market === '0xe2fedb9e6139a182b98e7c2688ccfa3e9a53c665') return; // skip for now, until DAI - USDC base is handled correctly
      if (!coinDataObj[long] || !coinDataObj[short]) return 
      symbols.push(`${coinDataObj[long].symbol}-${coinDataObj[short].symbol}-GMX-V2`)
      marketTokens.push(market)

      return {
        params: [
          // datastore address - filled in later
          {
            indexToken: index, longToken: long, shortToken: short, marketToken: market,
          },
          indexConfig,
          longConfig,
          shortConfig,
          hashString("MAX_PNL_FACTOR_FOR_DEPOSITS"),
          true,
        ],
      }

    }).filter((i: any) => i)
    const [
      decimals, datastores
    ] = await Promise.all([
      api.multiCall({ abi: 'erc20:decimals', calls: marketTokens }),
      api.multiCall({ abi: 'address:dataStore', calls: marketTokens }),
    ])


    datastores.forEach((i: any, index: number) => calls[index].params.unshift(i))
    const res = await api.multiCall({ abi: abis.getMarketTokenPrice, calls, target: gmReader, permitFailure: true, })
    const prices = res.map((i: any, idx: number) => i[0] / (10 ** (12 + +decimals[idx])))

    marketTokens.forEach((marketToken: string, i: number) => {
      addToDBWritesList(writes, chain, marketToken, +prices[i], decimals[i], symbols[i], timestamp, 'gmx-v2', 0.93)
    })
  }
}


function hashData(dataTypes: any, dataValues: any) {
  const bytes = ethers.AbiCoder.defaultAbiCoder().encode(dataTypes, dataValues);
  const hash = ethers.keccak256(ethers.getBytes(bytes));

  return hash;
}

function hashString(string: string) {
  return hashData(["string"], [string]);
}