import { Write, } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList, getTokenAndRedirectData } from "../../utils/database";

export const config: { [chain: string]: any } = {
  arbitrum: {
    factories: [{
      factory: "0xa3d87597fdafc3b8f3ac6b68f90cd1f4c05fa960",
      vaultType: 2,
    }],
  },
};

export default async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)

  const { factories } = config[chain]
  const writes: Write[] = [];
  await _getWrites()

  return writes

  async function _getWrites() {
    if (!factories.length) return;
    const pools: string[] = []
    for (const { factory, vaultType } of factories) {
      const numPools = await api.call({ abi: 'function getNumberOfVaults(uint8) view returns (uint256)', target: factory, params: vaultType })
      const poolCalls = []
      for (let i = 0; i < numPools; i++) poolCalls.push({ params: [vaultType, i], })
      pools.push(...await api.multiCall({ abi: 'function getVaultAt(uint8 vaultType, uint256 vaultId) view returns (address)', target: factory, calls: poolCalls }))
    }
    const [
      token0s, token1s, supplies, decimals, symbols, uBalances
    ] = await Promise.all([
      api.multiCall({ abi: 'address:getTokenX', calls: pools }),
      api.multiCall({ abi: 'address:getTokenY', calls: pools }),
      api.multiCall({ abi: 'uint256:totalSupply', calls: pools }),
      api.multiCall({ abi: 'erc20:decimals', calls: pools }),
      api.multiCall({ abi: "string:name", calls: pools }),
      api.multiCall({ abi: 'function getBalances() view returns (uint256 token0Bal, uint256 token1Bal)', calls: pools }),
    ])
    const coinData = await getTokenAndRedirectData([...token0s, ...token1s], chain, timestamp)

    uBalances.forEach(({ token0Bal, token1Bal }: any, i: number) => {
      const t0Data = getTokenInfo(token0s[i])
      const t1Data = getTokenInfo(token1s[i])

      if (!t0Data || !t1Data) return;

      const t0Value = (t0Data.price * token0Bal) / (10 ** t0Data.decimals)
      const t1Value = (t1Data.price * token1Bal) / (10 ** t1Data.decimals)
      const price = (t0Value + t1Value) / (supplies[i] / (10 ** decimals[i]))
      const t0confidence = t0Data.confidence ?? 0.8
      const t1confidence = t1Data.confidence ?? 0.8
      const confidence = t0confidence < t1confidence ? t0confidence : t1confidence

      addToDBWritesList(writes, chain, pools[i], price, decimals[i], symbols[i].replace(/Automated Pool Token( -)?/, 'APT').replace(/ (#)?/g, '_'), timestamp, 'timeswap', confidence)
    })

    function getTokenInfo(token: string) {
      token = token.toLowerCase()
      return coinData.find(i => i.address.toLowerCase() === token)
    }
  }
}
