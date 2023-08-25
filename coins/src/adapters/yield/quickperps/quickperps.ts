import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

export const config: any = {
  polygon_zkevm: {
    qlp: '0x973ae30Cb49986E1D3BdCAB4d40B96fEA5baBE84',
    qlpManager: '0x87BcD3914eD3dcd5886BA1c0f0DA25150b56fE54'
  }
}

export  async function getTokenPrices(timestamp: number, chain: string) {
  const writes: Write[] = [];
  const pricesObject: any = {}
  const api = await getApi(chain, timestamp, true)
  const { qlp, qlpManager } = config[chain]
  pricesObject[qlp] = await api.call({ abi: 'function getPrice(bool) view returns (uint256)', target: qlpManager, params: [0] }) / 1e30

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'quickperps' })
}
