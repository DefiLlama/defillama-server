import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

export const contracts: any = {
  ethereum: {
    synths: [
      '0x691Af94cC63B99bd36173eD6Fb1eF5508b2774ec'
    ],
  },
  optimism: {
    synths: [
      "0xdd63ae655b388cd782681b7821be37fdb6d0e78d",
      "0xccf3d1acf799bae67f6e354d685295557cf64761",
      "0x19382707d5a47e74f60053b652ab34b6e30febad",
      "0x539505dde2b9771debe0898a84441c5e7fdf6bc0",
    ],
  },
};

export default async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const pricesObject: any = {}
  const writes: Write[] = [];
  const { synths } = contracts[chain]
  if (['optimism'].includes(chain)) {
    let underlyings = await api.multiCall({ calls: synths, abi: 'address:token', })
    const uDecimals = await api.multiCall({ calls: underlyings, abi: 'erc20:decimals', })
    let prices = await api.multiCall({ calls: synths, abi: 'uint256:pricePerShare', })
    underlyings.forEach((underlying: any, i: number) => {
      pricesObject[synths[i]] = { underlying, price: prices[i]  / (10 ** uDecimals[i])}
    })

  } else {
    let underlyings = await api.multiCall({ calls: synths, abi: 'address:underlying', })
    const uDecimals = await api.multiCall({ calls: underlyings, abi: 'erc20:decimals', })
    const udata = await api.multiCall({ calls: synths.map((v: any, i: number) => ({ target: v, params: '' + (10 ** uDecimals[i]) })), abi: 'function quoteWithdrawIn(uint256) view returns (uint256 amount,uint256 fee)', })
    underlyings.forEach((underlying: any, i: number) => {
      pricesObject[synths[i]] = { underlying, price: udata[i].amount / (10 ** uDecimals[i]) }
    })
  }

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'metronome-synth' })
}
