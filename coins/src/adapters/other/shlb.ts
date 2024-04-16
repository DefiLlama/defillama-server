import { getApi } from "../utils/sdk";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../utils/database";
import { getTokenInfo } from "../utils/erc20";
import { Write, CoinData } from "../utils/dbInterfaces";

export const contracts: any = {
  avax: {
    vaults: [
      '0x668530302c6ecc4ebe693ec877b79300ac72527c',
      '0x536d7e7423e8fb799549caf574cfa12aae95ffcd',
      '0x9f44e67ba256c18411bb041375e572e3dd11fa72',
    ],
  },
};

export async function getTokenPrice(chain: string, timestamp: number) {
  const api = await getApi(chain, timestamp)
  const writes: Write[] = [];
  const { vaults } = contracts[chain]
  const [wants, totalSupplies] = await Promise.all([
    api.multiCall({ calls: vaults, abi: 'function want() view returns (address, address)', }),
    api.multiCall({ calls: vaults, abi: 'erc20:totalSupply', }),
  ])
  const calls = totalSupplies.map((v, i) => ({ target: vaults[i], params: v })) as any
  const totalAmounts = await api.multiCall({ abi: 'function getUnderlyingAssets(uint256) view returns (uint256 tokenA, uint256 tokenB)', calls, })

  const underlyings = wants.flat().flat()

  const [
    tokenInfos,
    coinsData
  ] = await Promise.all([
    getTokenInfo(chain, vaults, undefined),
    getTokenAndRedirectData(underlyings, chain, timestamp)
  ])

  vaults.map((token: string, i: number) => {
    const [tokenA, tokenB] = wants[i]
    const [tokenAAmount, tokenBAmount] = totalAmounts[i]
    const totalSupply = totalSupplies[i]

    const tokenAData: (CoinData | undefined) = coinsData.find((c: CoinData) => c.address.toLowerCase() === tokenA.toLowerCase());
    const tokenBData: (CoinData | undefined) = coinsData.find((c: CoinData) => c.address.toLowerCase() === tokenB.toLowerCase());
    if (!tokenAData || !tokenBData) return;

    const price = ((tokenAAmount * tokenAData.price) / (10 ** tokenAData.decimals) + (tokenBAmount * tokenBData.price) / (10 ** tokenBData.decimals)) * (10 ** tokenInfos.decimals[i].output) / totalSupply
    addToDBWritesList(writes, chain, token, price, tokenInfos.decimals[i].output, tokenInfos.symbols[i].output, timestamp, 'shlb', 0.9)
  })

  return writes
}


export default function shlb(timestamp: number = 0) {
  console.log("starting shlb");
  return Promise.all(Object.keys(contracts).map(chain => getTokenPrice(chain, timestamp)))
}
