import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getLogs } from "../../../utils/cache/getLogs";
import { getApi } from "../../utils/sdk";
import * as sdk from '@defillama/sdk'

const defaultFactory = '0x302c230bc53901d3fe363d3483b2548f938efa33'
const yieldFactory = '0xBD16088611054fce04711Aa9509D1D86E04dCe2c'

export const config = {
  ethereum: {
    factory: '0xd373a63ce95fe95bb8a3417dc075943cc39dd1d2',
    fromBlock: 14916881,
  },
  arbitrum: {
    fromBlock: 21005251,
  },
  optimism: {
    fromBlock: 22192569,
  },
  polygon: {
    fromBlock: 32785588,
  },
} as any

const abi = {
  slot0: "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  eventAbi: 'event DeployXPYT (address indexed asset_, address deployed)',
  eventAbi2: 'event DeployXPYT (address indexed pyt, address deployed, address pool)',
  eventAbiYield: 'event DeployYieldTokenPair (address indexed gate, address indexed vault, address nyt, address pyt)',
  getPricePerVaultShare: "function getPricePerVaultShare(address vault) view returns (uint256)",
  getUnderlyingOfVault: "function getUnderlyingOfVault(address vault) view returns (address)",
}

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { fromBlock, factory = defaultFactory, } = config[chain]
  const writes: Write[] = [];

  const api = await getApi(chain, timestamp, true)
  const data = await getxPytDetails(api, fromBlock, factory)
  const pytLogs = await getLogs({
    api,
    target: yieldFactory,
    topics: ['0x2ba651335cb36a0327665b260df4a5bd395a6807ba07425159234671d3ed3a1c'],
    fromBlock,
    eventAbi: abi.eventAbiYield,
    onlyArgs: true,
  })

  pytLogs.forEach((i: any) => {
    const pyt = i.pyt.toLowerCase()
    const existingRecord = data.find((j: any) => j.pyt === pyt)
    if (existingRecord) { //these have xpyt and have prices already
      existingRecord.gate = i.gate
      return;
    }

    data.push({
      pyt,
      nyt: i.nyt,
      gate: i.gate,
      pytPrice: 0.5,
      nytPrice: 0.5,
      vault: i.vault,
    })
  })

  const vaults = data.map((i: any) => i.vault)
  const gateCalls = data.map((i: any, idx: number) => ({ target: i.gate, params: vaults[idx]}) )


  const [
    underlyings,
    prices
    // decimals,
  ] = await Promise.all([
    api.multiCall({  abi: abi.getUnderlyingOfVault, calls: gateCalls}),
    api.multiCall({  abi: abi.getPricePerVaultShare, calls: gateCalls}),
    // api.multiCall({  abi: 'erc20:decimals', calls: vaults }),
  ])

  

  const pricesObject: any = {}
  data.forEach((val: any, i: number) => {
    const { pyt, nyt, pytPrice, nytPrice, xpyt, xpytPrice, } = val
    const underlying = underlyings[i]
    const ratio = prices[i] / 1e27
    pricesObject[pyt] = { underlying, price: pytPrice * ratio }
    pricesObject[nyt] = { underlying, price: nytPrice * ratio }
    if (xpytPrice) pricesObject[xpyt] = { underlying, price: xpytPrice * ratio }
  })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'timeless' })
}


const uniPoolMapping = {
  '0x12d92fe0Aa1c59C4f7a704D16561CFbaF17eC257': '0x1825c7a3deefd79b40c5664f9d0d795cedeac34d',
  '0x79dFc65F77C67D95652294f301beE5deA3d951fB': '0x8f2ac45f50178c0c7d443fa2cfc5437f9f688d6b',
  '0x841120E51aD43EfE489244728532854A352073aD': '0xa5480c56fa9b6451b137615b527a905647f83a20',
} as any

async function getxPytDetails(api: sdk.ChainApi, fromBlock: number, factory: string) {
  const logs = await getLogs({
    api,
    target: factory,
    topics: ['0x3cd5239cb0e65116a550909d626d5afd5e5f62da510bc89d5357012fdc071bd9'],
    fromBlock,
    eventAbi: abi.eventAbi2,
    onlyArgs: true,
  })


  const xpyts = logs.map((i: any) => i.deployed.toLowerCase())
  const uniPools = logs.map((i: any) => i.pool)
  const pyts = logs.map((i: any) => i.pyt.toLowerCase())

  if (api.chain === 'ethereum' || !api.chain) {
    const oldLogs = await getLogs({
      api,
      target: defaultFactory,
      topics: ['0x8a161203f601007e13bde046045538496da27c82292cab1d17d8fcc712ed2e63'],
      fromBlock,
      eventAbi: abi.eventAbi,
      onlyArgs: true,
    })
    xpyts.push(...oldLogs.map((i: any) => i.deployed.toLowerCase()))
    pyts.push(...oldLogs.map((i: any) => i.asset_.toLowerCase()))
    uniPools.push(...oldLogs.map((i: any) => uniPoolMapping[i.deployed].toLowerCase()))
  }

  const [
    totalAssets,
    totalSuppply,
    vaults,
    nyts,
    token0s,
    slot0s,
  ] = await Promise.all([
    api.multiCall({ calls: xpyts, abi: 'uint256:totalAssets' }),
    api.multiCall({ calls: xpyts, abi: 'uint256:totalSupply' }),
    api.multiCall({ calls: xpyts, abi: 'address:vault' }),
    api.multiCall({ calls: xpyts, abi: 'address:nyt' }),
    api.multiCall({ calls: uniPools, abi: 'address:token0' }),
    api.multiCall({ calls: uniPools, abi: abi.slot0 }),
  ])
  const ks = totalAssets.map((val: any, i) => totalSuppply[i] / val)
  const ls = slot0s.map((val, i) => {
    const isToken0 = token0s[i].toLowerCase() === xpyts[i]
    const price = (val.sqrtPriceX96 ** 2) / (2 ** 192)
    return isToken0 ? 1 / price : price
  })
  const res = xpyts.map((xpyt: any, i: number) => {
    const k = ks[i]
    const l = ls[i]
    return {
      xpyt, k, l,
      vault: vaults[i],
      pyt: pyts[i],
      nyt: nyts[i],
      xpytPrice: 1 / (k + l),
      nytPrice: l / (k + l),
      pytPrice: k / (k + l),
    }
  })
  return res.filter((i: any) => !isNaN(i.k))
}
