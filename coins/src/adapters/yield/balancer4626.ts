import { getLogs } from "../../utils/cache/getLogs";
import { getApi } from "../utils/sdk";
import { calculate4626Prices } from "../utils/erc4626";

const config: any = {
  xdai: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 37360338 },
  ethereum: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 21332121 },
  sonic: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 368135 },
  arbitrum: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 297810187 },
  base: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 25343854 },
  optimism: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 133969439 },
  avax: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 59955604 },
  hyperliquid: { vault: '0xbA1333333333a1BA1108E8412f11850A5C319bA9', fromBlock: 6132445 },
}

export function balancer4626(timestamp: number = 0) {
  const allWrites = Object.keys(config).map((c) => getTokenPrices(c, timestamp))
  return Promise.all(allWrites)
}

async function getTokenPrices(chain: string, timestamp: number) {
  const { vault, fromBlock } = config[chain]
  const api = await getApi(chain, timestamp)
  const logs = await getLogs({ api, target: vault, fromBlock, eventAbi: regsistedEvents, onlyArgs: true, topics: ['0xbc1561eeab9f40962e2fb827a7ff9c7cdb47a9d7c84caeefa4ed90e043842dad'], })
  let tokens = logs.map((l: any) => l.tokenConfig.map((t: any) => t.token.toLowerCase())).flat()
  tokens = [...new Set(tokens)]
  const assetTest = await api.multiCall({ abi: 'address:asset', calls: tokens, permitFailure: true })
  tokens = tokens.filter((_t: any, i: number) => !!assetTest[i])
  return calculate4626Prices(chain, timestamp, tokens, 'meta-morphos')
}

const regsistedEvents = "event PoolRegistered(address indexed pool, address indexed factory, (address token, uint8 tokenType, address rateProvider, bool paysYieldFees)[] tokenConfig, uint256 swapFeePercentage, uint32 pauseWindowEndTime, (address pauseManager, address swapFeeManager, address poolCreator) roleAccounts, (bool enableHookAdjustedAmounts, bool shouldCallBeforeInitialize, bool shouldCallAfterInitialize, bool shouldCallComputeDynamicSwapFee, bool shouldCallBeforeSwap, bool shouldCallAfterSwap, bool shouldCallBeforeAddLiquidity, bool shouldCallAfterAddLiquidity, bool shouldCallBeforeRemoveLiquidity, bool shouldCallAfterRemoveLiquidity, address hooksContract) hooksConfig, (bool disableUnbalancedLiquidity, bool enableAddLiquidityCustom, bool enableRemoveLiquidityCustom, bool enableDonation) liquidityManagement)"