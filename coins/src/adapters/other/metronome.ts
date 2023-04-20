import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const contracts: any = {
  ethereum: {
    synths: [
      '0x691Af94cC63B99bd36173eD6Fb1eF5508b2774ec'
    ],
  },
};

export default async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const writes: Write[] = [];
  const { synths } = contracts[chain]
  let underlyings = await api.multiCall({ calls: synths, abi: 'address:underlying', })
  const uDecimals = await api.multiCall({ calls: underlyings, abi: 'erc20:decimals', })
  const udata = await api.multiCall({ calls: synths.map((v: any, i:number) => ({ target: v, params: ''+ (10 ** uDecimals[i])})), abi: 'function quoteWithdrawIn(uint256) view returns (uint256 amount,uint256 fee)', })
  const pricesObject: any = {}
  underlyings.forEach((underlying: any, i: number) => {
    pricesObject[synths[i]] = { underlying, price: udata[i].amount / (10 ** uDecimals[i]) }
  })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'metronome-synth' })
}
