import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const config: any = {
  blast: { factory: '0x455b20131D59f01d082df1225154fDA813E8CeE9' },
}

export function few(timestamp: number = 0) {
  return Promise.all(
    Object.keys(config).map((chain) => getTokenPrice(chain, timestamp)),
  );
}

async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const pricesObject: any = {}
  const writes: Write[] = [];
  const fewTokens = await api.fetchList({ lengthAbi: 'allWrappedTokensLength', itemAbi: 'allWrappedTokens', target: config[chain].factory })
  const tokens = await api.multiCall({  abi: 'address:token', calls: fewTokens})
  const tokenSupplies = await api.multiCall({  abi: 'erc20:totalSupply', calls: fewTokens})
  const bals  = await api.multiCall({  abi: 'erc20:balanceOf', calls: tokens.map((target: string, idx: number) => ({ target, params: fewTokens[idx]}))})
  fewTokens.forEach((v: any, i: number) => {
    pricesObject[v] = { underlying: tokens[i], price: bals[i] / tokenSupplies[i] }
  })
  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'few' })
}
