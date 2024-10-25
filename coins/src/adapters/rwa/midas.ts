import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const abi = 'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)'
const contracts: {[chain: string]: { token: string, oracle: string }[] } = {
  ethereum: [
    {
      token: "0xDD629E5241CbC5919847783e6C96B2De4754e438", // mTBILL contract
      oracle: "0x056339C044055819E8Db84E71f5f2E1F536b2E5b", // mTBILL oracle
    },
    {
      token: "0x2a8c22E3b10036f3AEF5875d04f8441d4188b656", // mBASIS contract
      oracle: "0xE4f2AE539442e1D3Fb40F03ceEbF4A372a390d24", // mBASIS oracle
    },
  ]
}

export async function midas(timestamp: number): Promise<Write[]> {
  const writes: Write[] = [];
  for (const chain of Object.keys(contracts)) {
    const _writes = await _getTokenPrices(chain, timestamp);
    writes.push(..._writes);
  }
  return writes;
}

async function _getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const data = contracts[chain]
  const tokens = data.map((item: any) => item.token)
  const oracles = data.map((item: any) => item.oracle)
  const prices = (await api.multiCall({  abi, calls: oracles})).map((item: any) => item.answer / 1e8)
  const pricesObject: any = {}
  tokens.forEach((token: any, index: number) => {
    pricesObject[token] = { price: prices[index] }
  })

  return getWrites({ chain, timestamp, pricesObject, projectName: 'midas' })
}
