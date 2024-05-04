const abi = require("./abi.json");
const contracts = require("./contracts.json");
import { Write, CoinData } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getApi, } from "../../utils/sdk";
import { ChainApi } from "@defillama/sdk";
import { getCache, setCache } from "../../../utils/cache";
import { PromisePool } from "@supercharge/promise-pool";
import * as sdk from '@defillama/sdk'

const nullAddress = "0x0000000000000000000000000000000000000000"

async function getPools(
  api: ChainApi,
  name: string | undefined,
  cache: any
) {
  cache.registries = cache.registries || {};

  const registryIds = {
    stableswap: 0,
    stableFactory: 3,
    crypto: 5,
    cryptoFactory: 6,
  };


  const bscRegistries = [
    "0x266bb386252347b03c7b6eb37f950f476d7c3e63",
    nullAddress,
    nullAddress,
    "0x41871a4c63d8fae4855848cd1790ed237454a5c4",
  ]

  async function getPcsPools(api: ChainApi) {
    const target = "0x36bBb126e75351C0DfB651e39b38fe0BC436FFD2";
    const pools: any = {};
    cache.registries.pcs = target
    pools["pcs"] = await api.fetchList({ lengthAbi: abi.pairLength, itemAbi: abi.swapPairContract, target })
    return pools;
  }

  async function getPoolsFromRegistryAggregator(api: ChainApi) {
    const target = "0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC";
    cache.registries.crypto = target
    const pools: any = {};
    pools["crypto"] = await api.fetchList({ lengthAbi: abi.pool_count, itemAbi: abi.pool_list, target })
    return pools;
  }

  const { chain } = api;
  if (name == "pcs") return getPcsPools(api);
  if (chain == "ethereum") return getPoolsFromRegistryAggregator(api);
  const registries: string[] = chain == "bsc" ? bscRegistries : (
    await api.multiCall({
      target: contracts[chain].addressProvider,
      calls: Object.values(registryIds),
      abi: abi.get_id_info,
    })
  ).map((r: any) => r.addr);

  let i = 0

  const pools: any = {};
  for (const key of Object.keys(registryIds)) {
    if (registries[i] == nullAddress) {
      i++
      continue
    }
    cache.registries[key] = registries[i]
    pools[key] = await api.fetchList({ lengthAbi: abi.pool_count, itemAbi: abi.pool_list, target: registries[i] })
    i++
  }

  return pools;
}

async function PoolToToken(
  api: ChainApi,
  pool: any,
) {
  pool = pool.toLowerCase();
  let token: string;

  const faultyPools: string[] = [
    "0x5633e00994896d0f472926050ecb32e38bef3e65",
    "0xd0c855c092dbc41055a40297420bba0a6f46f8ad",
  ];
  if (faultyPools.includes(pool)) {
    throw new Error(`pool at ${pool} is faulty some how`);
  }

  try {
    token = (await api.call({ target: pool, abi: abi.token, })).toLowerCase();
  } catch {
    try {
      token = (await api.call({ target: pool, abi: abi.lp_token, })).toLowerCase();
    } catch {
      const mapping: { [key: string]: any } = {
        // pool contract : token contract
        "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7":
          "0x6c3f90f043a72fa612cbac8115ee7e52bde6e490",
        "0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27":
          "0x3b3ac5386837dc563660fb6a0937dfaa5924333b",
        "0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56":
          "0x845838df265dcd2c412a1dc9e959c7d08537f8a2",
        "0x4ca9b3063ec5866a4b82e437059d2c43d1be596f":
          "0xb19059ebb43466c323583928285a49f558e572fd",
        "0x06364f10b501e868329afbc005b3492902d6c763":
          "0xd905e2eaebe188fc92179b6350807d8bd91db0d8",
        "0x93054188d876f558f4a66b2ef1d97d16edf0895b":
          "0x49849c98ae39fff122806c06791fa73784fb3675",
        "0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714":
          "0x075b1bb99792c9e1041ba13afef80c91a1e70fb3",
        "0xc5424b857f758e906013f3555dad202e4bdb4567":
          "0xa3d87fffce63b53e0d54faa1cc983b7eb0b74a9c",
        "0xa5407eae9ba41422680e2e00537571bcc53efbfd":
          "0xc25a3a3b969415c80451098fa907ec722572917f",
        "0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c":
          "0x9fc689ccada600b6df723d9e47d84d76664a1f23",
        "0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51":
          "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8",
        "0x8038c01a0390a8c547446a0b2c18fc9aefecc10c":
          "0x3a664ab939fd8482048609f652f9a0b0677337b9",
        "0x4f062658eaaf2c1ccf8c8e36d6824cdf41167956":
          "0xd2967f45c4f384deea880f807be904762a3dea07",
        "0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604":
          "0x5b5cfe992adac0c9d48e05854b2d91c73a003858",
        "0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171":
          "0x6d65b498cb23deaba52db31c93da9bffb340fb8f",
        "0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6":
          "0x1aef73d49dedc4b1778d0706583995958dc862e6",
        "0xc18cc39da8b11da8c3541c598ee022258f9744da":
          "0xc2ee6b0334c261ed60c72f6054450b61b8f18e35",
        "0x3e01dd8a5e1fb3481f0f589056b428fc308af0fb":
          "0x97e2768e8e73511ca874545dc5ff8067eb19b787",
        "0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1":
          "0x4f3e8f405cf5afc05d68142f3783bdfe13811522",
        "0x890f4e345b1daed0367a877a1612f86a1f86985f":
          "0x94e131324b6054c0d789b190b2dac504e4361b53",
        "0x071c661b4deefb59e2a3ddb20db036821eee8f4b":
          "0x410e3e86ef427e30b9235497143881f717d93c2a",
        "0xd81da8d904b52208541bade1bd6595d8a251f8dd":
          "0x2fe94ea3d5d4a175184081439753de15aef9d614",
        "0x7f55dde206dbad629c080068923b36fe9d6bdbef":
          "0xde5331ac4b3630f94853ff322b66407e0d6331e8",
        "0xc25099792e9349c7dd09759744ea681c7de2cb66":
          "0x64eda51d3ad40d56b9dfc5554e06f94e1dd786fd",
        "0x80466c64868e1ab14a1ddf27a676c3fcbe638fe5":
          "0xca3d75ac011bf5ad07a98d02f18225f9bd9a6bdf",
        "0xd51a44d3fae010294c616388b506acda1bfaae46":
          "0xc4ad29ba4b3c580e6d59105fff484999997675ff",
        "0x9838eccc42659fa8aa7daf2ad134b53984c9427b":
          "0x3b6831c0077a1e44ed0a21841c3bc4dc11bce833",
        "0x98a7f18d4e56cfe84e3d081b40001b3d5bd3eb8b":
          "0x3d229e1b4faab62f621ef2f6a610961f7bd7b23b",
        "0x8301ae4fc9c624d1d396cbdaa1ed877821d7c511":
          "0xed4064f376cb8d68f770fb1ff088a3d0f3ff5c4d",
        "0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4":
          "0x3a283d9c08e8b55966afb64c515f5143cf907611",
        "0xadcfcf9894335dc340f6cd182afa45999f45fc44":
          "0x8484673ca7bff40f82b041916881aea15ee84834",
        "0x98638facf9a3865cd033f36548713183f6996122":
          "0x8282bd15dca2ea2bdf24163e8f2781b30c43a2ef",
        "0x752ebeb79963cf0732e9c0fec72a49fd1defaeac":
          "0xcb08717451aae9ef950a2524e33b6dcaba60147b",
        "0xe84f5b1582ba325fdf9ce6b0c1f087ccfc924e54":
          "0x70fc957eb90e37af82acdbd12675699797745f68",
        "0x3a1659ddcf2339be3aea159ca010979fb49155ff":
          "0x58e57ca18b7a47112b877e31929798cd3d703b0f",
        "0x960ea3e3c7fb317332d990873d354e18d7645590":
          "0x8e0b8c8bb9db49a46697f3a5bb8a308e744821d2",
        "0xa827a652ead76c6b0b3d19dba05452e06e25c27e":
          "0x3dfe1324a0ee9d86337d06aeb829deb4528db9ca",
        "0xb755b949c126c04e0348dd881a5cf55d424742b2":
          "0x1dab6560494b04473a0be3e7d83cf3fdf3a51828",
      };
      token = mapping[pool] ? mapping[pool] : pool;
    }
  }
  return token;
}

const chainBlacklistedPools: any = {
  xdai: [
    '0x8C720914Af9BB379fD7297DAB375c969d76e47D0'
  ]
}

export default async function getTokenPrices2(chain: any, registries: string[], timestamp: number, name: string | undefined = undefined, customPools: any = undefined) {
  const writes: Write[] = [];
  const cache = await getCache('curve', name ? name : chain)
  const api = await getApi(chain, timestamp)
  let poolList
  if (customPools) {
    poolList = { custom: customPools }
    registries = ['custom']
    cache.registries = { custom: '' }
  } else {
    poolList = await getPools(api, name, cache);
  }
  await unknownPools2(api, timestamp, poolList, registries, writes, cache)
  await setCache('curve', name ? name : chain, cache)
  return writes.filter((w: Write) => w.price != undefined && !isNaN(w.price));
}

async function unknownPools2(api: ChainApi, timestamp: number, poolList: any, registries: string[], writes: Write[], cache: any) {
  if (!cache.poolInfo)
    cache.poolInfo = {}

  let unknownTokensList: string[] = [];
  let unknownPoolList: any[] = [];

  const cPoolInfo = cache.poolInfo
  for (let registryType of registries) {
    let blacklisedPools = new Set((chainBlacklistedPools[api.chain] ?? []).map((p: string) => p.toLowerCase()))

    const rPoolList = (poolList[registryType] ?? []).filter((p: string) => !blacklisedPools.has(p.toLowerCase()))

    if (!rPoolList || !rPoolList.length) continue;

    // update cache info
    await PromisePool.withConcurrency(2)
      .for(rPoolList)
      .process(async (pool: any) => {
        if (!cPoolInfo[pool])
          cPoolInfo[pool] = { pool }
        const poolData = cPoolInfo[pool]

        // set pool LP information
        if (!poolData.lpToken) {
          try {
            poolData.lpToken = await PoolToToken(api, pool)
            poolData.decimals = await api.call({ target: poolData.lpToken, abi: 'erc20:decimals' })
            poolData.symbol = await api.call({ target: poolData.lpToken, abi: 'string:symbol' })
            // poolData.name = await api.call({ target: poolData.lpToken, abi: 'string:name' })
          } catch (e) {
            delete cPoolInfo[pool];
            console.log('failed to get lp token', pool)
            return;
          }
        }

        // set pool tokens information
        if (!poolData.tokens)
          try {
            poolData.tokens = await getPoolTokens(api, pool, cache.registries[registryType], registryType)
          } catch {
            delete cPoolInfo[pool];
            console.log('failed to get pool underlyings', pool)
            return;
          }

        poolData.tokens = poolData.tokens.map((t: string) => t.toLowerCase())
      });

    sdk.log('curve', api.chain, poolList[registryType].length, registryType)

    let filteredIndicies: number[] = []
    let lps: string[] = []
    // set total supplies
    const tryLps = rPoolList.map((p: any) => cPoolInfo[p]?.lpToken)
    tryLps.map((l: any, i: number) => l == null || l == undefined ? filteredIndicies.push(i) : lps.push(l))
    const supplies = await api.multiCall({ calls: lps, abi: 'erc20:totalSupply', permitFailure: true })

    // filter pools with no token 
    let filteredOut = 0
    const filteredRPoolList: string[] = []
    rPoolList.map((p: any, i: number) =>
      filteredIndicies.includes(i) ? filteredOut++ : filteredRPoolList.push(p)
    )
    // filter out pools with no supplies
    const filteredData: any[] = []
    filteredRPoolList.forEach((pool: any, i: number) => {
      const poolData = { ...cPoolInfo[pool] }

      if (!supplies[i] || supplies[i] === '0' || !poolData.tokens || !poolData.tokens.length) {
        filteredOut++
      } else {
        poolData.totalSupply = supplies[i]
        filteredData.push(poolData)
      }
    })
    sdk.log('filtered Out', filteredOut, api.chain, registryType)

    // set pool balances
    await getPoolBalances(api, filteredData, cache.registries[registryType], registryType)

    // get pool tokens prices/info
    let allPoolTokens = filteredData.map((p: any) => p.tokens).flat()
    allPoolTokens = [...new Set(allPoolTokens)]
    const coinsData = await getTokenAndRedirectData(allPoolTokens, api.chain, api.timestamp!, 4);
    const coinDataMap: { [key: string]: CoinData } = {}
    coinsData.forEach((c: CoinData) => coinDataMap[c.address] = c)
    unknownTokensList.push(...allPoolTokens.filter((t: string) => !coinDataMap[t]))

    // add pools to write list
    filteredData.forEach((poolData: any) => {
      const pool = poolData.pool

      poolData.poolComponents = poolData.tokens.map((token: string, i: number) => {
        const coinData = coinDataMap[token]
        if (!coinData) return undefined
        return {
          token,
          balance: poolData.balances[i] / 10 ** coinData.decimals,
          price: coinData.price,
          value: poolData.balances[i] * coinData.price / 10 ** coinData.decimals,
          decimals: coinData.decimals,
          confidence: coinData.confidence,
        };
      })

      const poolComponents = poolData.poolComponents

      // skip pools with unknown tokens
      if (poolComponents.some((c: any) => c == undefined)) {
        unknownPoolList.push({ ...poolData, address: pool, token: poolData.lpToken, })
        return;
      }


      const isJunk = poolComponents.find(
        (t: any) =>
          t.price == null || t.price <= 0 ||
          t.balance == null || t.balance == 0,
      );
      if (isJunk) return;

      const poolValue: number = poolComponents.reduce((p: number, c: any) => p + c.balance * c.price, 0,);
      // ignore pools worth under $400
      if (poolValue < 400) return;

      const price = poolValue * (10 ** poolData.decimals) / poolData.totalSupply

      if (isNaN(price) || price == 0 || price == Infinity) return;

      const confidence = poolComponents.map((p: any) => {
        if (p.confidence == undefined) return 0.9;
        return p.confidence;
      }).reduce((a: any, b: any) => a + b, 0) / poolComponents.length;

      addToDBWritesList(writes, api.chain, poolData.lpToken, price, +poolData.decimals, poolData.symbol, timestamp, "curve-LP", confidence,);
    })
  }

  await getUnknownTokenValue()

  async function getUnknownTokenValue() {

    const usdSwapSize = 500;
    unknownTokensList = [...new Set(unknownTokensList)];
    const tokenDecimals = await api.multiCall({ calls: unknownTokensList, abi: 'erc20:decimals', permitFailure: true })
    const tokenSymbols = await api.multiCall({ calls: unknownTokensList, abi: 'erc20:symbol', permitFailure: true })
    const unknownTokenData = unknownTokensList.map((t: string, i: number) => {
      let knownTokenInfo: any = null
      let symbol = tokenSymbols[i]
      let decimals = tokenDecimals[i]
      if (!symbol || !decimals) return;
      unknownPoolList.forEach((p: any) => {
        if (!p.tokens.includes(t)) return;
        const uTokenIndex = p.tokens.indexOf(t)
        p.poolComponents.forEach((c: any) => {
          if (!c || c.token === t || c.value < 20000) return; // ignore tokens with less than $20k
          if (!knownTokenInfo || knownTokenInfo.value < c.value) {
            const realQuantity = usdSwapSize
            const decimalFactor = 10 ** decimals
            const priceBN = c.price * 1e8
            const rawQuantity = sdk.util.convertToBigInt(Number(realQuantity * decimalFactor * 1e8 / priceBN).toFixed(0))
            knownTokenInfo = { kInfo: c, pool: p.pool, uTokenIndex, kTokenIndex: p.tokens.indexOf(c.token), rawQuantity: rawQuantity.toString(), realQuantity: realQuantity.toString() }
          }
        })
      })
      if (!knownTokenInfo) return;
      return {
        decimals,
        symbol,
        uToken: t,
        ...knownTokenInfo,
      }
    }).filter((t: any) => t)
    const rawCalls = unknownTokenData.map((t: any) => ({ target: t.pool, params: [t.uTokenIndex, t.kTokenIndex, t.rawQuantity] }))
    const rawDys = await api.multiCall({ calls: rawCalls, abi: abi.get_dy, permitFailure: true })

    let failedTokenData: any[] = []
    let failedCalls: any[] = []
    rawDys.forEach((d: any, i: number) => {
      if (!d) {
        failedCalls.push(rawCalls[i])
        failedTokenData.push(unknownTokenData[i])
        return;
      }
      const data = unknownTokenData[i]
      const decimalDiff = 10 ** (data.decimals - data.kInfo.decimals)
      const tokenPrice = (data.kInfo.price * d * decimalDiff) / rawCalls[i].params[2]

      addToDBWritesList(writes, api.chain, data.uToken, tokenPrice, +data.decimals, data.symbol, timestamp, "curve-unknown-token", data.kInfo.confidence,);
    })
    const rawDys2 = await api.multiCall({ calls: failedCalls, abi: abi.get_dy2, permitFailure: true })

    rawDys2.forEach((d: any, i: number) => {
      if (!d) {
        return;
      }
      const data = failedTokenData[i]
      const decimalDiff = 10 ** (data.decimals - data.kInfo.decimals)
      const tokenPrice = (data.kInfo.price * d * decimalDiff) / failedCalls[i].params[2]

      addToDBWritesList(writes, api.chain, data.uToken, tokenPrice, +data.decimals, data.symbol, timestamp, "curve-unknown-token", data.kInfo.confidence,);
    })

  }

  async function getPoolTokens(api: ChainApi, pool: any, registry: string, registryType: string) {
    if (registryType === 'pcs') {
      const tokens = await api.fetchList({ lengthAbi: 'uint256:N_COINS', itemAbi: 'function coins(uint256) view returns (address)', target: pool })
      return tokens
    } else if (registryType === 'custom') {
      const tokens = []
      let i = 0
      do {
        try {
          const token = await api.call({ target: pool, abi: 'function coins(uint256) view returns (address)', params: [i] })
          tokens.push(token)
        } catch (e) {
          // console.log('failed to get token', e)
          i = 1000;
        }
      } while (i++ < 10)
      return tokens;
    }
    const coins = await api.call({ target: registry, params: pool, abi: abi.get_coins[registryType], })
    return coins.filter((c: string) => c != nullAddress)
  }

  async function getPoolBalances(api: ChainApi, filteredData: any, registry: string, registryType: string) {
    const pools = filteredData.map((p: any) => p.pool)
    if (registryType === 'pcs' || registryType === 'custom') {
      const calls: any = []
      filteredData.forEach((p: any) => {
        p.tokens.forEach((_t: string, i: number) => calls.push({ target: p.pool, params: i }))
      })
      const balances = await api.multiCall({ abi: 'function balances(uint256) view returns (uint256)', calls, permitFailure: true })
      let i = 0
      filteredData.forEach((p: any) => {
        p.balances = balances.slice(i, i + p.tokens.length)
        i += p.tokens.length
      })
      return;
    }
    sdk.log(api.chain, registry, registryType)
    let mabi = abi.get_balances[registryType] ?? abi.get_balances.crypto
    if (api.chain === 'polygon' && registryType === 'cryptoFactory') mabi = "function get_balances(address _pool) external view returns (uint256[2])"
    if (api.chain === 'bsc' && registryType === 'stableswap') mabi = "function get_balances(address _pool) external view returns (uint256[4])"
    const poolBalancesAll = await api.multiCall({ target: registry, calls: pools, abi: mabi, requery: true })
    filteredData.forEach((poolData: any, i: number) => {
      poolData.balances = poolBalancesAll[i].slice(0, poolData.tokens.length)
    })
  }

}
