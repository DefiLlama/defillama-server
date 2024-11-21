import {getLatestBlock, getLogs} from "@defillama/sdk/build/util/index"
import { getAllInfo } from "../utils"

const logToAddress = (log:string)=>`0x${log.substr(26, 40)}`

const bridgeContracts = [
  ["ethereum", "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d"],
  ["bsc", "0x59447362798334d3485c64D1e4870Fde2DDC0d75"]
]

export default async function bridge() {
  return []
  // TODO: refactor below code to cache getLogs data
/*   const currentBlock = (await getLatestBlock("xdai")).number
  const fromBlock = currentBlock - 3600 // ~ 5 hours ago

  const bridged = await Promise.all(bridgeContracts.map(async ([originChain, bridgeContract])=>{
    // emit NewTokenRegistered(_nativeToken, _bridgedToken);
    // line 651 of https://blockscout.com/xdai/mainnet/address/0x2dbdCC6CAd1a5a11FD6337244407bC06162aAf92/contracts
    const events = await getLogs({
      target: bridgeContract,
      topic: "NewTokenRegistered(address,address)",
      keys:[],
      fromBlock,
      toBlock: currentBlock,
      chain: "xdai"
    })
    const bridgedTokens = events.output.map((event:any)=>{
      const nativeToken = logToAddress(event.topics[1])
      const bridgedToken = logToAddress(event.topics[2])
      const to = `${originChain}:${nativeToken}`
      return {
        from: `xdai:${bridgedToken}`,
        to,
        getAllInfo: getAllInfo(bridgedToken, 'xdai', to)
      }
    })
    return bridgedTokens
  }))

  return ([] as typeof bridged[0]).concat(...bridged) */
}