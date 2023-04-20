import { Write, } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList, getTokenAndRedirectData } from "../../utils/database";

export const config = {
  ethereum: {
    lps: [
      '0xabddafb225e10b90d798bb8a886238fb835e2053',
      '0x50379f632ca68d36e50cfbc8f78fe16bd1499d1e',
    ],
  },
  polygon: {
    lps: [
      '0x873f4ae80867b9f97304b9bb7ef92c4d563fa48c',
    ],
  },
} as any

export default async function getTokenPrices(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)

  const { lps } = config[chain]
  const writes: Write[] = [];
  await _getWrites()

  return writes

  async function _getWrites() {
    if (!lps.length) return;
    const [
      token0s, token1s, supplies, decimals, symbols, uBalances
    ] = await Promise.all([
      api.multiCall({ abi: 'address:token0', calls: lps }),
      api.multiCall({ abi: 'address:token1', calls: lps }),
      api.multiCall({ abi: 'uint256:totalSupply', calls: lps }),
      api.multiCall({ abi: 'erc20:decimals', calls: lps }),
      api.multiCall({ abi: "string:symbol", calls: lps }),
      api.multiCall({ abi: 'function getUnderlyingBalances() view returns (uint256 token0Bal, uint256 token1Bal)', calls: lps }),
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

      addToDBWritesList(writes, chain, lps[i], price, decimals[i], symbols[i], timestamp, 'arrakis', confidence)
    })

    function getTokenInfo(token: string) {
      token = token.toLowerCase()
      return coinData.find(i => i.address.toLowerCase() === token)
    }
  }
}
