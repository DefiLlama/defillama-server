import { Write, } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";
import { getApi } from "../../utils/sdk";

export const config = {
  ethereum: {
    pools: [
      { version: 'v2', pool: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9' },
      { version: 'v3', pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2' },
    ]
  },
  polygon: {
    pools: [
      { version: 'v2', pool: '0x8dFf5E27EA6b7AC08EbFdf9eB090F32ee9a30fcf' },
      { version: 'v3', pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
    ]
  },
  avax: {
    pools: [
      { version: 'v2', pool: '0x4F01AeD16D97E3aB5ab2B501154DC9bb0F1A5A2C' },
      { version: 'v3', pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD' },
    ]
  },
} as any

export default async function getTokenPrices(chain: string, timestamp: number) {
  const { pools, } = config[chain]
  const writes: Write[] = [];

  const api = await getApi(chain, timestamp, true)
  const pricesObject: any = {}
  for (const { version, pool } of pools) {
    const tokens = await api.call({ abi: abi.getReservesList, target: pool })
    const data = await api.multiCall({ abi: abi.getReserveData[version], calls: tokens, target: pool })
    tokens.forEach((underlying: any, i: number) => {
      pricesObject[data[i].variableDebtTokenAddress] = { underlying, price: -1 }
      pricesObject[data[i].stableDebtTokenAddress] = { underlying, price: -1 }
    })
  }

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'aave-debt' })
}

const abi: any = {
  getReservesList: 'address[]:getReservesList',
  "getReserveData": {
    "v3": "function getReserveData(address asset) view returns (((uint256 data) configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))",
    "v2": "function getReserveData(address asset) view returns (((uint256 data) configuration, uint128 liquidityIndex, uint128 variableBorrowIndex, uint128 currentLiquidityRate, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint8 id))",
  }
}