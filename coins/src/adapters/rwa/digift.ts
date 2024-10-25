import { Write } from "../utils/dbInterfaces";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const DFeedPriceAddress = "0x7d4d68f18d1be3410ab8d827fb7ebc690f938d2d"
const tokenListAbi = "function getAllTokenRecords() view returns (tuple(uint256 chainId, address tokenAddress, uint64 tokenType)[])"
const tokenPriceAbi = "function getTokenPrice(uint256, address) view returns (uint128)"


async function getTokenPrices(chain: string, timestamp: number, writes: Write[]) {
  const api = await getApi(chain, timestamp)
  const tokenAPI = await getApi('polygon', timestamp)
  const tokens = await getTokenList()
  const prices = await getTokenPrice(tokens)
  const pricesObject: any = {}
  tokens.forEach((token: any, index: number) => {
    pricesObject[token] = { price: prices[index] / 1e18 }
  })

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'digift' })


  async function getTokenList() {
    return (await tokenAPI.call({
      target: DFeedPriceAddress,
      abi: tokenListAbi
    })).filter((item: any) => item[0] == api.chainId && item[2] == '1').map((item: any) => item[1]);
  }

  async function getTokenPrice(tokens: string[]) {
    return tokenAPI.multiCall({
      abi: tokenPriceAbi,
      calls: tokens.map((i: any) => ({ params: [api.chainId, i] })),
      target: DFeedPriceAddress
    })
  }
}

export async function digift(timestamp: number = 0) {

  const writes: Write[] = [];
  await getTokenPrices("ethereum", timestamp ,writes);
  await getTokenPrices("arbitrum", timestamp, writes);
  return writes;
}
