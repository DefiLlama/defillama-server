import { Write } from "../utils/dbInterfaces";
import { getApi } from "../utils/sdk";
import getWrites from "../utils/getWrites";

const chain: any = "arbitrum";

export default async function getTokenPrice(timestamp: number) {
  const api = await getApi(chain, timestamp);
  const pricesObject: any = {};
  const vaults = [
    '0xB0F3e3F5C52Ece66Fe44ac7ECedbD06B7aEc11b2',
    '0x5F01D28467953fDa3dc0e2828DAEAbDa0b06CDF3',
  ]
  const pids = [0, 1]
  const calls: any = pids.map(pid => vaults.map((vault) => ({ target: vault, params: [pid] }))).flat()
  const exchangeRates = await api.multiCall({ abi: 'function GDpriceToStakedtoken(uint256) view returns (uint256)', calls })
  const data = await api.multiCall({ abi: 'function poolInfo(uint256) view returns (address lpToken, address GDlptoken, uint256 EarnRateSec, uint256 totalStaked, uint256 lastUpdate, uint256 vaultcap, uint256 depositFees, uint256 withdrawFees, uint256 APR, bool stakable, bool withdrawable, bool rewardStart)', calls })
  data.forEach((d, i) => {
    pricesObject[d.GDlptoken] = { price: exchangeRates[i] / 1e18, underlying: d.lpToken }
  })
  const writes: Write[] = []
  await getWrites({ chain, timestamp, writes, pricesObject, projectName: "gmdV2", })
  return writes;
}
