import {call} from "@defillama/sdk/build/abi/abi2"
import { getAllInfo } from "../utils"

export default async function bridge() {
  const tokens = [
    "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", // matic
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // usdt
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // usdc
    "0x6b175474e89094c44da98b954eedeac495271d0f", // dai
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // wbtc
  ]

  return await Promise.all(tokens
    .map(async (token) => {
      const [name, symbol, decimals] = await Promise.all(["string:name", "string:symbol", "uint8:decimals"].map(abi => call({ abi, target: token })))
      const wrapperAddress = await call({
        target: "0x2a3dd3eb832af982ec71669e178424b10dca2ede",
        abi: "function precalculatedWrapperAddress(uint32 originNetwork,address originTokenAddress,string calldata name,string calldata symbol,uint8 decimals) external view returns (address)",
        params: [0, token, name, symbol, decimals],
        chain: "polygon_zkevm"
      })
      const to = `ethereum:${token}`
      return {
        from: `polygon_zkevm:${wrapperAddress}`,
        to,
        getAllInfo: getAllInfo(wrapperAddress, 'polygon_zkevm', to)
      };
    }))
}
