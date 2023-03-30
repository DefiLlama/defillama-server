import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

export const config = {
  ethereum: {
    tokens: [
      '0xf63b34710400cad3e044cffdcab00a0f32e33ecf', // weth token
    ]
  },
} as any

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { tokens, } = config[chain]
  const writes: Write[] = [];

  const api = await getApi(chain, timestamp, true)
  const underlyings = await api.multiCall({  abi: 'address:UNDERLYING_ASSET_ADDRESS', calls: tokens}) 
  const pricesObject: any = {}
  underlyings.forEach((underlying: any, i: number) => {
    pricesObject[tokens[i]] = { underlying, price: -1 }
  })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'aave-debt' })
}
