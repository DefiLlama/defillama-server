import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

export const config: any = {
  arbitrum: {
    pool: '0x32B7bF19cb8b95C27E644183837813d4b595dcc6',
    stable: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    stableDecimals: 18,
  },
  bsc: {
    pool: '0xA5aBFB56a78D2BD4689b25B8A77fd49Bb0675874',
    stable: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    stableDecimals: 18,
  },
}

export  async function getTokenPrices(timestamp: number, chain: string) {
  const writes: Write[] = [];
  const pricesObject: any = {}
  const api = await getApi(chain, timestamp, true)
  const { pool, stable, } = config[chain]
  if (chain === 'bsc') {
    const tranches = await api.fetchList({  lengthAbi: 'uint256:getAllTranchesLength', itemAbi: 'function allTranches(uint256) view returns (address)', target: pool })
    const [value, supply, ] = await Promise.all([
      api.multiCall({ abi: 'function getTrancheValue(address, bool) view returns (uint256)', calls: tranches.map((i: any) => ({ params: [i, false]})), target: pool }),
      api.multiCall({ abi: 'erc20:totalSupply', calls: tranches }),
    ])
    tranches.forEach((token: any, i: any) => {
      pricesObject[token] = { underlying: stable, price: value[i] / (supply[i] * 1e12) }
    })

  } else {

    const tranches = await api.call({ abi: 'address[]:getAllTranches', target: pool })
    const liquidityCalculator = await api.call({ abi: 'address:liquidityCalculator', target: pool })
    const [value, supply, ] = await Promise.all([
      api.multiCall({ abi: 'function getTrancheValue(address, bool) view returns (uint256)', calls: tranches.map((i: any) => ({ params: [i, false]})), target: liquidityCalculator }),
      api.multiCall({ abi: 'erc20:totalSupply', calls: tranches }),
    ])
    tranches.forEach((token: any, i: any) => {
      pricesObject[token] = { underlying: stable, price: value[i] / (supply[i] * 1e12) }
    })
  }

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'level-finance' })
}
