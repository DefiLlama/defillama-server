import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
const projectName = 'unknownTokensV3';

const slot0Abi = "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint32 feeProtocol, bool unlocked)"

const config: any = {
  blast: {
    '0x216a5a1135a9dab49fa9ad865e0f22fe22b5630a': '0x017f31dc55144f24836c2566ed7dc651256c338a' // PUMP
  },
  map: {
    '0x756af1d3810a01d3292fad62f295bbcc6c200aea': '0xc6a16fac07c059689873988fa4c635d45ca170e2' // LSGS
  },
}

export function unknownTokensV3(timestamp: number = 0) {
  console.log("starting " + projectName);
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
  
  slot0s.forEach((v: any, i: number) => {
    const token = tokens[i].toLowerCase()
    let token0 = token0s[i].toLowerCase()
    let price = Math.pow(1.0001, v.tick)
    if (token !== token0) price = 1 / price
    pricesObject[token] = { underlying: token0 === token ? token1s[i] : token0, price }
  })
  return getWrites({ chain, timestamp, pricesObject, projectName })
}
