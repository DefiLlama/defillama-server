import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
const projectName = 'seamless'
const config: any = {
  base: { dataProvider: '0x2A0979257105834789bC6b9E1B00446DFbA8dFBa' },
}

export function seamless(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain) => getTokenPrice(chain, timestamp)),
  );
}

async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const pricesObject: any = {}
  const writes: Write[] = [];
  const res = await api.call({ abi: "function getAllReservesTokens() view returns ((string symbol, address tokenAddress)[])", target: config[chain].dataProvider })
  let rTokens = res.map((v: any) => v.tokenAddress) as string[]
  const names = await api.multiCall({ abi: 'string:name', calls: rTokens })
  rTokens = rTokens.filter((_v: any, i: number) => names[i].startsWith('Seamless ILM'))
  const tokens = await api.multiCall({ abi: 'address:underlying', calls: rTokens })
  const tokenSupplies = await api.multiCall({ abi: 'erc20:totalSupply', calls: rTokens })
  const bals = await api.multiCall({ abi: 'erc20:balanceOf', calls: tokens.map((target: string, idx: number) => ({ target, params: rTokens[idx] })) })
  rTokens.forEach((v: any, i: number) => {
    if (+tokenSupplies[i] === 0) return;
    pricesObject[v] = { underlying: tokens[i], price: bals[i] / tokenSupplies[i] }
  })
  return getWrites({ chain, timestamp, writes, pricesObject, projectName })
}
