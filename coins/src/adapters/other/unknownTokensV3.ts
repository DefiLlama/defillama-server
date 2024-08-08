import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
const projectName = 'unknownTokensV3';

const slot0Abi = "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)"

const config: any = {
  // [token]: uniV3pool
  blast: {
    '0x216a5a1135a9dab49fa9ad865e0f22fe22b5630a': '0x017f31dc55144f24836c2566ed7dc651256c338a' // PUMP
  },
  map: {
    '0x756af1d3810a01d3292fad62f295bbcc6c200aea': '0xc6a16fac07c059689873988fa4c635d45ca170e2' // LSGS
  },
  mantle: {
    '0x029d924928888697d3F3d169018d9d98d9f0d6B4': '0x417ed45c1adf3a3eb21fba7a40a4e2e4c3405050' // Muito
  },
  ethereum: {
    '0xBEF26Bd568e421D6708CCA55Ad6e35f8bfA0C406': '0x26FA8b07DcE29Fb1F0fb3C889E01b59dEbADeFdA', // BCUT
    '0x0bB9aB78aAF7179b7515e6753d89822b91e670C4': '0xF77C8cE2b0944505Ee8AFf5E5Bd0f39C10F35C5c', // kUSD
    '0xf02C96DbbB92DC0325AD52B3f9F2b951f972bf00': '0xeAb1724Bae42bDAA74cB2269f22db0A763E79969', // krETH
    '0x513D27c94C0D81eeD9DC2a88b4531a69993187cF': '0xd992d160d0617CfBA73a2D2AbF098dF4F630Ed37', // ksETH
  },
  kroma: {
    '0x61e0D34b5206Fa8005EC1De8000df9B9dDee23Db': '0x62330719f844dB255EF135f977176D72497dc881' // spETH
  },
}

export function unknownTokensV3(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain) => getTokenPrice(chain, timestamp)),
  );
}

async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const pricesObject: any = {}
  const pools: any = Object.values(config[chain])
  const tokens = Object.keys(config[chain])
  const token0s = await api.multiCall({ abi: 'address:token0', calls: pools })
  const token1s = await api.multiCall({ abi: 'address:token1', calls: pools })
  const slot0s = await api.multiCall({ abi: slot0Abi, calls: pools })
  const tokens0Decimals = await api.multiCall({  abi: 'erc20:decimals', calls: token0s})
  const tokens1Decimals = await api.multiCall({  abi: 'erc20:decimals', calls: token1s})

  slot0s.forEach((v: any, i: number) => {
    const token = tokens[i].toLowerCase()
    let token0 = token0s[i].toLowerCase()
    let price = Math.pow(1.0001, v.tick) * 10 ** (tokens0Decimals[i] - tokens1Decimals[i])
    if (token !== token0) price = 1 / price
    pricesObject[token] = { underlying: token0 === token ? token1s[i] : token0, price }
  })
  return getWrites({ chain, timestamp, pricesObject, projectName })
}
