
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";
import { Write } from "../utils/dbInterfaces";
import { getUniqueAddresses } from "@defillama/sdk/build/generalUtil";

const config = {
  ethereum: [
    "0x86b130298719F753808E96cA6540b684a2d21466",// wstETH
    "0xD2358c5d01065b13F2Ad1107d5a4531Cd98aC7A1",// rETH
    "0x0c8e1e97d9f41a21D6Ef98E644a5516d9b7F593f",// wETH
    "0x2165AEA91B33631A772d1723b88a98C1Ca820116",// weETH
    "0x4aCc76B4B3E4529D7cE88Ca921D7a4112f25A6dA", // USDC
  ]
}

export default async function getPrices(timestamp: number = 0) {
  const writes: Write[] = []
  for (const [chain, pools] of Object.entries(config)) {
    const api = await getApi(chain, timestamp)
    let balVaults = await api.fetchList({ lengthAbi: 'getUnderlyingPoolsLength', itemAbi: 'function getUnderlyingPool(uint8) view returns (address)', targets: pools, })
    balVaults = getUniqueAddresses(balVaults, chain)

    const supplies = await api.multiCall({ abi: 'erc20:totalSupply', calls: balVaults })
    const bals = await api.multiCall({ abi: 'uint256:totalAssets', calls: balVaults })
    const assets = await api.multiCall({ abi: 'address:asset', calls: balVaults })
    const pricesObject: any = {}
    for (let i = 0; i < balVaults.length; i++) {
      pricesObject[balVaults[i]] = { price: bals[i] / supplies[i], underlying: assets[i] }
    }
    await getWrites({ chain, timestamp, writes, pricesObject, projectName: "opal", })
  }
  return writes
}