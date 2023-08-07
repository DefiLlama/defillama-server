import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

export const contracts: any = {
  arbitrum: {
    silos: [
      "0x0696e6808ee11a5750733a3d821f9bb847e584fb",
      "0xde998e5eef06dd09ff467086610b175f179a66a0",
    ],
  },
};

export default async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const pricesObject: any = {}
  const writes: Write[] = [];
  const { silos } = contracts[chain]
  for (const silo of silos) {
    const { assets, assetsStorage} = await api.call({ target: silo, abi: abi.getAssetsWithState, })
    const tokens = assetsStorage.map((v: any) => v.collateralToken)
    const tokenSupplies = await api.multiCall({ abi: 'erc20:totalSupply', calls: tokens, })
    tokens.forEach((token: any, i: number) => {
      pricesObject[token] = { underlying: assets[i], price: assetsStorage[i].totalDeposits / tokenSupplies[i] }
    })
  }
  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'metronome-synth' })
}

const abi = {
  "getAssetsWithState": "function getAssetsWithState() view returns (address[] assets, tuple(address collateralToken, address collateralOnlyToken, address debtToken, uint256 totalDeposits, uint256 collateralOnlyDeposits, uint256 totalBorrowAmount)[] assetsStorage)",
}